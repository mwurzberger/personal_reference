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
"use strict";

if (! window.dhweb) { var dhweb = {}; }
if (! dhweb.collections ) { dhweb.collections = {}; }

dhweb.collections.Tags = Backbone.Collection.extend({
	logClass: "dhweb.collections.Tags",
	model: dhweb.models.Tag,
	comparator: function( modelA, modelB)
	{
		var a = modelA.getName().toLowerCase(),
			b = modelB.getName().toLowerCase();

		return dhweb.utils.naturalSort( a, b );
	},

	initialize: function() 
	{
		this.on( "add", _.bind(this.handleTagModelAdded, this) );
		this.on( "reset", _.bind(this.handleCollectionReset, this) );
	},

	/*
    ====================================================================================================
    Handlers
    ====================================================================================================
    */
    handleTagModelAdded: function( tag )
    {    	
    	log && log.trace(this.logClass + ".handleTagAdded(", tag.getId(), ")");    	
    },

    handleCollectionReset: function( event )
    {
    	log && log.debug(this.logClass + ".handleCollectionReset()");
    	log && log.debug( this.toString() );    	
    },

	/*
    ====================================================================================================
    Single Tag
    ====================================================================================================
    */

    getTagByName: function( tagName )
	{
		log && log.debug(this.logClass + ".getTagByName(", tagName, ")");
		return this.findWhere({ name: tagName });
	},

	getTagById: function( tagId )
	{
		log && log.debug(this.logClass + ".getTagById(", tagId, ")");
		return this.findWhere({ id: tagId });
	},

	hasTagName: function( tagName )
	{
		log && log.debug(this.logClass + ".hasTagName(", tagName, ")");
		return (this.findWhere({ name: tagName }) !== undefined);
	},

	setTagProperty: function( tagId, propertyName, value )
	{
		log && log.debug(this.logClass + ".setTagProperty(", tagId, propertyName, value, ")");
		var tag = this.getTagById( tagId );
		tag.set( propertyName, value);
	},

	removeTagById: function( tagId ){
		var tag = this.getTagById( tagId );
		this.remove( tag );
	},

    /*
    ====================================================================================================
    Tag Collections
    ====================================================================================================
    */
	getRealTags: function()
	{
		log && log.debug(this.logClass + ".getRealTags()");
		return _.filter( this.models, function( tag ){
			return !tag.isFakeTag();
		});
	},

	getRealTagsAttribute: function( attributeName )
	{
		log && log.debug(this.logClass + ".getRealTagsAttribute(", attributeName, ")");
		return _.map( this.getRealTags(), function( model ){
			return model.get( attributeName );
		});	
	},
	
	getMostRecentlyUsedTags: function( maxCount )
	{
		log && log.debug(this.logClass + ".getMostRecentlyUsedTags(", maxCount, ")");
		maxCount = ( maxCount === undefined ) ? 10 : maxCount;
		var recentlyUsedTags = _.chain( this.models )
			.filter( function(tag){
				return ( tag.getLastUsed() === 0 || tag.isFakeTag() ) ? false : true ;
			})
			.sortBy(function( tag ){
				return ( tag.getLastUsed() * -1.0 );
			})
			.take( maxCount )
			.value();
		return recentlyUsedTags;
	},	

	getSelectedTagIds: function()
	{
		log && log.debug(this.logClass + ".getSelectedTagIds()");
		return _.pluck( this.where({ "selected": true }), "id");
	},	

	deselectAllTags: function()
	{
		log && log.debug(this.logClass + ".deselectAllTags()");
		_.forEach( this.models, function( model ){
			model.setSelected( false );
		});
	},

	filterBy: function( attribute, value )
	{
		log && log.debug(this.logClass + ".filterBy( " + attribute + ", value )");
		log && log.trace( "value", value );
		return _.filter( this.models, function( tag ){
	        return _.contains( value, tag.get( attribute ));
	    });
	},

	getTagAttributeListWithFilterBy: function( getAttribute, filterAttribute, value )
	{
		log && log.debug(this.logClass + ".getTagAttributeListWithFilterBy( " + getAttribute + ", " + filterAttribute + ", value )");
		log && log.trace( "value", value );
		// Note that after running this.filterBy you do not have a Collection of Tag Models but an array
		// this means that a _.map cannot access hidden attributes
		return _.map( this.filterBy( filterAttribute, value), function( tag ){
			return tag.get( getAttribute );
		});		
	},

	/*
    ====================================================================================================
    Class Methods
    ====================================================================================================
    */
	toString: function()
	{
		log && log.trace(this.logClass + ".toString()");
		var tagToStrings = _.map( this.models, function( tag ){
			return tag.toString();
		});

		var output = [],
			divider = "   ";

		output.push( dhweb.utils.string.pad( "", 36, "-" ) );
		output.push( dhweb.utils.string.pad( "", 8, "-" ) );
		output.push( dhweb.utils.string.pad( "", 5, "-" ) );		
		output.push( dhweb.utils.string.pad( "", 17, "-" ) );
		output.push( dhweb.utils.string.pad( "", 50, "-" ) );		
		tagToStrings.unshift( output.join( divider ) );

		output = [];
		output.push( dhweb.utils.string.padRight( "GUID", 36 ) );
		output.push( dhweb.utils.string.padRight( "Selected", 8 ) );
		output.push( dhweb.utils.string.padRight( "Count", 5 ) );		
		output.push( dhweb.utils.string.padRight( "Last Used", 17 ) );		
		output.push( "Tag Name" );
		tagToStrings.unshift( output.join( divider ) );

		tagToStrings.unshift("\r\n");
		tagToStrings.push("\r\n");
		return tagToStrings.join("\r\n");
	}
});