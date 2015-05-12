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
if (! dhweb.app ) { dhweb.app = {}; }

dhweb.app.tagController = _.extend({
	logClass: 'dhweb.app.tagController',
	tags: null,
	
	initialize: function()
	{
		log && log.debug(this.logClass + '.initialize()');
		this.tags = new dhweb.collections.Tags();
		this.listenTo( dhweb.app.eventAggregator, dhweb.app.events.WATCH_LIST_ITEM_CHANGED(), this.handleWatchlistItemChange );
		this.updateTagsViaHiddenField();
	},

	/*
    ====================================================================================================
    Collection Managment
    ====================================================================================================
    */

    refreshWatchlistTags: function()
	{
		log && log.debug(this.logClass + '.refreshWatchlistTags()');	

		$j.ajax({
            type: 'POST',
            url: '/v4/asyncData',
            data: {
                'method': 'GetWatchlistTags'
            }, 
            context: this,
            complete: function( jqXHR, textStatus )
            {                
                var $json = $j.parseJSON(jqXHR.responseText);
                if( $json.tagsList ){
					this.updateTags( $json.tagsList );			
				}           
            }
        });   		
	},

	updateTagsViaHiddenField: function()
	{
		log && log.debug(this.logClass + '.updateTagsViaHiddenField()');
		this.updateTags( $j.parseJSON( $j('#userWatchlistTags').val() ) );
	},

	handleWatchlistItemChange: function( event ){
		log && log.debug(this.logClass + '.handleWatchlistItemChange()');
		this.updateTags( event.tagsJSON );
	},

	updateTags: function( tagsJSON )
	{
		log && log.debug(this.logClass + '.updateTags()');
		this.tags.reset( tagsJSON, {merge: true} );

		dhweb.app.eventAggregator.trigger( dhweb.app.events.TAGS_CHANGED(), { 'class': this.logClass });
	},

	updateTag: function( tagId, tagName, tagMethod )
	{
		log && log.debug(this.logClass + '.updateTag( ' + tagId + ', ' + tagName + ', ' + tagMethod +' )');
        tagName = he.encode( tagName, {
            'encodeEverything': true,
            'useNamedReferences': false
        });

        $j.ajax({
            type: 'POST',
            url: '/v4/asyncData',
            data: {
                'method': 'ManageTags',
                'tagId': tagId,
                'tagName': tagName,
                'tagMethod': tagMethod
            }, 
            context: this,
            complete: function( jqXHR, textStatus )
            {              
            	var $json = $j.parseJSON(jqXHR.responseText);

            	dhweb.app.eventAggregator.trigger( dhweb.app.events.TAG_UPDATED(), {
		            'class': this.logClass,
		            'tagMethod': tagMethod,
		            'tagId': tagId
		        });

		        if( tagMethod === 'delete' ){
		        	dhweb.app.tagController.tags.removeTagById( tagId );
		        } else {
		        	var tagJSON = _.find( $json.tagsList, function( tag ){
		        		return tag.id === tagId;
		        	}, this);
		        	dhweb.app.tagController.tags.add( tagJSON, {merge: true} );
		        }
            }
        });   
	},

    /*
    ====================================================================================================
    Accessors
    ====================================================================================================
    */

    getTagsByIdList: function( idList )
	{
		log && log.debug(this.logClass + '.getTagsByIdList()');
		return this.tags.filterBy( 'id', idList );
	},

	getTagNamesByIdList: function( idList )
	{
		log && log.debug(this.logClass + '.getTagNamesByIdList()');		
		return this.tags.getTagAttributeListWithFilterBy( 'name', 'id', idList );
	},

	getTagNamesForTypeahead: function() 
	{
		log && log.debug(this.logClass + '.getTagNamesForTypeahead()');
		return this.tagNamesForTypeahead;
	},


    /*
    ====================================================================================================
    Utilities
    ====================================================================================================
    */

    formatTag: function( tagStr )
    {
    	tagStr = tagStr + ''; // Cast to string
    	tagStr = this.formatTagMaxLength( tagStr );
    	tagStr = this.formatTagTrimWhitespace( tagStr );
    	return tagStr;
    },

    formatTagTrimWhitespace: function( tagStr ) 
	{		
		//TODO replace with tagStr.trim() when IE8 is removed
		tagStr = tagStr + ''; // Cast to string
		tagStr = tagStr.replace(/^\s+|\s+$/g,''); 
		return tagStr;
	},

	formatTagMaxLength: function( tagStr )
	{
		var maxTagLength = 50;    		

		tagStr = tagStr + ''; // Cast to string
    	if( tagStr.length > maxTagLength )
    	{
    		//TODO add warning message
    		return tagStr.substring(0, maxTagLength);
    	}
    	return tagStr;
	}
}, Backbone.Events);

$j(document).ready(function() {
    dhweb.app.tagController.initialize();
});