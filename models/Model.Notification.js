/* jshint browser: true, esnext:true, globalstrict:true, quotmark:true, smarttabs:true, trailing:true, undef:true, latedef:true, camelcase:true, eqeqeq:true, indent:4, maxparams:3, curly:true, -W030 */
/* global $j, _, log, he, Backbone */

/*
 * jQuery is set to $j to prevent conflict with legacy code.
 * 
 * -W030 is for 'Expected an assignment or function call and instead saw an expression' triggered by the log && log.debug('text') lines. 
 * If log is undefined then the JS shortcuts past the debug statement. See perf tests at:
 *     https://jsperf.com/logging-overhead-test
 *     https://jsperf.com/logging-performance-in-function
 */
'use strict';

if (! window.dhweb) { var dhweb = {}; }
if (! dhweb.models) { dhweb.models = {}; }

dhweb.models.Notification = Backbone.Model.extend({
	logClass: 'dhweb.models.Notification',

	defaults: 
	{
		itemNo: '',	    		// Item associated with this notification
		emailAlert: false,		// Will this notification be recieved via email		
		onlineAlert: false,		// Will this notification be recieved via website
		emailAddress: '', 		// Email address notification message will be sent to
		createdDate: '',		// Date notification was first set
		timeToLive: -1,			// Days left to display an active website notification
		branches: [],			// Array of branch objects form of { 'branchName': 'Branch Name', 'branchNumber': 1, 'stocked': false, 'selected': false}
		isNew: true,			// Is this notification new (Derived)
		active: false			// Is this notifiction active or pending (Derived)
	},

	initialize: function() 
	{
		log && log.trace(this.logClass + '.initialize()');
		this.setBranches( _.sortBy( this.getBranches(), 'branchNumber' ) );		
		this.setIsNew( !this.isOnlineAlert() && !this.isEmailAlert() );
		this.setActive( this.getTimeToLive() > 0 );		

		// Sort branches into display order
		this.setBranches( 
			_.sortBy( this.getBranches(), function( branch ){
				switch( branch.branchNumber ) {
	      			case 1: return 1; // Harrisburg
	      			case 6: return 2; // Atlanta
	      			case 5: return 3; // Chicago
	      			case 4: return 4; // Fresno
	      			default: return 0;
	      		}
			})
		);

		// Defaults if this is new
		if( this.isNew() ){
			// Check all branches that are out of stock
			_.forEach( this.getBranches(), function( branch ){
				if( !branch.stocked ){
					branch.selected = true;
				}
			}, this);

			// Set both types of alerts by default
			this.setEmailAlert( true );
			this.setOnlineAlert( true );
		} else {
			// Uncheck any branches which have stock
			_.forEach( this.getBranches(), function( branch ){
				if( branch.stocked ){
					branch.selected = false;
				}
			}, this);
		}

		log && log.trace(this.logClass, this.toString());
	},

	hasBranchSelected: function()
	{
		log && log.trace(this.logClass + '.hasBranchSelected()');
		return _.some( this.getBranches(), 'selected' );
	},

	toString: function()
	{
		log && log.trace(this.logClass + '.toString() ', this.getItemNo());
		var masterOutput = '\r\n',
			output = [],
			divider = '   ',
			isFirst = true;

		// Generate column headers
		output.push( dhweb.utils.string.padRight( 'Branch', 10 ) );
    	output.push( dhweb.utils.string.padRight( 'No', 2 ) );
    	output.push( dhweb.utils.string.padRight( 'In Stock', 8 ) );
    	output.push( dhweb.utils.string.padRight( 'Selected', 8 ) );
    	output.push( dhweb.utils.string.padRight( 'Item No', 20 ) );
        output.push( dhweb.utils.string.padRight( 'Send Email', 10 ) );
        output.push( dhweb.utils.string.padRight( 'Web Alert', 10 ) );
		output.push( dhweb.utils.string.padRight( 'Active', 10 ) );
		output.push( dhweb.utils.string.padRight( 'Created', 10 ) );
		output.push( dhweb.utils.string.padRight( 'TTL', 3 ) );
        output.push( dhweb.utils.string.padRight( 'Email Address', 40 ) ); 
        output.push('\r\n');
        masterOutput = masterOutput + output.join( divider );

        // Generate seperator row
        output = [];
        output.push( dhweb.utils.string.pad( '', 10, '-' ) );
    	output.push( dhweb.utils.string.pad( '', 2, '-' ) );
    	output.push( dhweb.utils.string.pad( '', 8, '-' ) );
    	output.push( dhweb.utils.string.pad( '', 8, '-' ) );
    	output.push( dhweb.utils.string.pad( '', 20, '-' ) );
        output.push( dhweb.utils.string.pad( '', 10, '-' ) );
        output.push( dhweb.utils.string.pad( '', 10, '-' ) );
		output.push( dhweb.utils.string.pad( '', 10, '-' ) );
		output.push( dhweb.utils.string.pad( '', 10, '-' ) );
		output.push( dhweb.utils.string.pad( '', 3, '-' ) );
        output.push( dhweb.utils.string.pad( '', 40, '-' ) ); 
        output.push('\r\n');
        masterOutput = masterOutput + output.join( divider );

        _.each( this.getBranches(), function( branch ){     
        	output = [];   	        	
        	output.push( dhweb.utils.string.padRight( branch.branchName, 10 ) );
        	output.push( dhweb.utils.string.padRight( branch.branchNumber, 2 ) );
        	output.push( dhweb.utils.string.padRight( branch.stocked.toString(), 8 ) );
        	output.push( dhweb.utils.string.padRight( branch.selected.toString(), 8 ) );
        	if( isFirst ){
        		isFirst = false;
        		output.push( dhweb.utils.string.padRight( this.getItemNo(), 20 ) );
		        output.push( dhweb.utils.string.padRight( this.isEmailAlert().toString(), 10 ) );
		        output.push( dhweb.utils.string.padRight( this.isOnlineAlert().toString(), 10 ) );
				output.push( dhweb.utils.string.padRight( this.isActive().toString(), 10 ) );
				output.push( dhweb.utils.string.padRight( this.getCreatedDate(), 10 ) );
				output.push( dhweb.utils.string.padRight( this.getTimeToLive().toString(), 3 ) );
		        output.push( dhweb.utils.string.padRight( this.getEmailAddress(), 40 ) );  
        	} else {
        		output.push( dhweb.utils.string.padRight( '-', 20 ) );
		        output.push( dhweb.utils.string.padRight( '-', 10 ) );
		        output.push( dhweb.utils.string.padRight( '-', 10 ) );
				output.push( dhweb.utils.string.padRight( '-', 10 ) );
				output.push( dhweb.utils.string.padRight( '-', 10 ) );
				output.push( dhweb.utils.string.padRight( '-', 3 ) );
		        output.push( dhweb.utils.string.padRight( '-', 40 ) );  
        	}
        	masterOutput = masterOutput + output.join( divider ) + '\r\n';
        }, this );    		
		return masterOutput;
	}
});