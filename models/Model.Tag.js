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

dhweb.models.Tag = Backbone.Model.extend({
	logClass: 'dhweb.models.Tag',
	emptyGUID: '00000000-0000-0000-0000-000000000000',
	fakeGUID: '11111111-2222-3333-4444-555555555555',

	defaults: 
	{
		id: '',	            // Database ID
		name: '',			// Name of the tag shown on screen		
		count: 0,			// Number of items in watchlist using this tag
		lastUsed: 0,		// Milliseconds from epoch when tag was last used
		selected: false, 	// Is this tag being used as a filter right now
		dbName: '',			// Name of the tag in database (HTML encoded &#x99; format)
		fakeTag: false		// Test if this a fake tag like 'Items Untagged'
	},

	initialize: function() 
	{
		log && log.trace(this.logClass + '.initialize()');
		
		if( this.getId() === this.fakeGUID ){
			this.setFakeTag( true );
		}

        if( this.getName() === '' ){
            this.decodeName();
        }

        if( this.getId() === ''){
            this.setId( this.emptyGUID );
        }

        if( this.getLastUsed() < 0){
            this.setLastUsed( 0 );
        }

		this.on('change:dbName', _.bind(this.decodeName, this));
        this.on('change:count', _.bind(this.countChanged, this));
        log && log.trace(this.logClass, this.toJSON());
	},

	decodeName: function()
	{
		log && log.trace(this.logClass + '.decodeName()');
		this.set('name', he.decode( this.get('dbName') ));
		log && log.trace(this.logClass + '.decodeName', this.get('dbName'), 'to', this.get('name'));
	},

	encodeName: function()
	{
		log && log.trace(this.logClass + '.encodeName()');
		var newName = he.encode( this.get('name'), {
			'encodeEverything': true,
      		'useNamedReferences': false
		});

		this.set( 'dbName', newName );
		log && log.debug( this.logClass + '.encodeName', this.get('name'), 'to', this.get('dbName') );
	},

	countChanged: function()
	{
		log && log.debug(this.logClass + '.countChanged()');
		if( this.getCount() === 0 && this.isSelected() ){
			//TODO Raise event saying last item was deleted
			this.setSelected( false );
		}
	},

	toString: function()
	{
		log && log.trace(this.logClass + '.toString() ', this.getId());
		var output = [],
			divider = '   ';

		output.push( dhweb.utils.string.padRight( this.getId(), 36 ) );
        output.push( dhweb.utils.string.padRight( this.isSelected().toString(), 8 ) );
		output.push( dhweb.utils.string.padLeft( this.getCount(), 5 ) );
        output.push( dhweb.utils.string.padRight( this.getLastUsed(), 17 ) );        
		output.push( this.getName() );				
		return output.join(divider);
	}
});