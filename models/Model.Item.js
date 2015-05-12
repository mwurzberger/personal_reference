/* jshint browser: true, esnext:true, globalstrict:true, quotmark:true, smarttabs:true, trailing:true, undef:true, latedef:true, camelcase:true, eqeqeq:true, indent:4, maxparams:3, curly:true, -W030 */
/* global $j, _, log, he, Backbone */

/*
 * jQuery is set to $j to prevent conflict with legacy code.
 * 
 * -W030 is for "Expected an assignment or function call and instead saw an expression" triggered by the log && log.debug("text") lines. 
 * If log is undefined then the JS shortcuts past the debug statement. See perf tests at:
 *     https://jsperf.com/logging-overhead-test
 *     https://jsperf.com/logging-performance-in-function
 */

'use strict';

if (! window.dhweb) { var dhweb = {}; }
if (! dhweb.models) { dhweb.models = {}; }

dhweb.models.Item = Backbone.Model.extend({
	logClass: 'dhweb.models.Item',

	defaults: 
	{
		itemNo: '',	    		// Item Number
		isWatchlist: false,		// Boolean indicating if item is in the watchlist or not		
		watchlistAddDate: '',	// Date String of when item was added to the watchlist
		tags: []				// Array of Tag ID's associated with this item
	},

	initialize: function() 
	{
		log && log.trace(this.logClass + '.initialize()');
		log && log.trace(this.toString());
		this.hasTags = ( this.getTags().length > 0 ) ? true : false ;
	},

	toString: function()
	{
		log && log.trace(this.logClass + '.toString() ', this.getItemNo());
		var output = [],
			divider = '   ';

		output.push( dhweb.utils.string.padRight( this.getItemNo(), 36 ) );
        output.push( dhweb.utils.string.padRight( this.isWatchlist().toString(), 8 ) );
		output.push( dhweb.utils.string.padLeft( this.getWatchlistAddDate(), 17 ) );

		if( dhweb.app.tagController && this.hasTags ){
			var tags = dhweb.app.tagController.getTagNamesByIdList( this.getTags() );
			output.push( dhweb.utils.string.padRight( tags.toString(), 100 ).slice(0, 100) );        			
		}        
		return output.join(divider);
	}
});