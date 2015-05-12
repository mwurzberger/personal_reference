/* jshint browser: true, esnext:true, globalstrict:true, quotmark:true, smarttabs:true, trailing:true, undef:true, latedef:true, camelcase:true, eqeqeq:true, indent:4, maxparams:3, curly:true, -W030 */
/* global $j, _, log, he, Backbone, bootbox */

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
if (! dhweb.collections ) { dhweb.collections = {}; }

dhweb.collections.Items = Backbone.Collection.extend({
	logClass: 'dhweb.collections.Items',
	model: dhweb.models.Item,

	initialize: function() 
	{
		log && log.debug(this.logClass + '.initialized()');
	},

	getModelByItemNo: function( itemNo ){
		log && log.debug(this.logClass + '.getModelByItemNo(', itemNo, ')');
		return this.findWhere({ itemNo: itemNo.toString() });
	},

	setAttrByItemNo: function( itemNo, attr, value ){
		log && log.debug(this.logClass + '.setAttrByItemNo( ' + itemNo + ', ' + attr + ', ' + value + ' )');
		var model = this.findWhere({ itemNo: itemNo.toString() });
		model.set( attr, value );
	},

	/*
    ====================================================================================================
    Class Methods
    ====================================================================================================
    */
	toString: function()
	{
		log && log.trace(this.logClass + '.toString()');
		var modelStrings = _.map( this.models, function( model ){
			return model.toString();
		});

		var output = [],
			divider = '   ';

		output.push( dhweb.utils.string.pad( '', 36, '-' ) );
		output.push( dhweb.utils.string.pad( '', 8, '-' ) );		
		output.push( dhweb.utils.string.pad( '', 17, '-' ) );
		if( dhweb.app.tagController ){
			output.push( dhweb.utils.string.pad( '', 100, '-' ) );		
		}
		modelStrings.unshift( output.join( divider ) );

		output = [];
		output.push( dhweb.utils.string.padRight( 'ItemNo', 36 ) );
		output.push( dhweb.utils.string.padRight( 'Watchlist', 8 ) );
		output.push( dhweb.utils.string.padRight( 'Watched On', 17 ) );		
		if( dhweb.app.tagController ){
			output.push( 'Tags' );
		}
		modelStrings.unshift( output.join( divider ) );

		modelStrings.unshift('\r\n');
		modelStrings.push('\r\n');
		return modelStrings.join('\r\n');
	}
});