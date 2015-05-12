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
if (! dhweb.app ) { dhweb.app = {}; }

dhweb.app.itemController = _.extend({
	logClass: 'dhweb.app.itemController',
	views: null,
    items: null,
	
	initialize: function()
	{
		log && log.debug(this.logClass + '.initialize()');

		this.views = new Backbone.ChildViewContainer(); // https://github.com/marionettejs/backbone.babysitter
		this.items = new dhweb.collections.Items();

        // Additional Item bindings
        this.listenTo( dhweb.app.eventAggregator, dhweb.app.events.WATCH_LIST_ITEM_ADDED(), this.triggerWatchListChangeEvent );
        this.listenTo( dhweb.app.eventAggregator, dhweb.app.events.WATCH_LIST_ITEM_UPDATED(), this.triggerWatchListChangeEvent );
        this.listenTo( dhweb.app.eventAggregator, dhweb.app.events.WATCH_LIST_ITEM_REMOVED(), this.triggerWatchListChangeEvent );
	},

    triggerWatchListChangeEvent: function( data ){
        dhweb.app.eventAggregator.trigger( dhweb.app.events.WATCH_LIST_ITEM_CHANGED(), data);
    },

    initializeViews: function( $container, source, hasProductZoom ){
        log && log.debug(this.logClass + '.initializeViews()');
        hasProductZoom = ( typeof(hasProductZoom) === 'undefined' ) ? true : hasProductZoom; 

        // General Level
        $container.find('[data-toggle="tooltip"]').tooltip({container: 'body', html: true});
        $container.find('[data-toggle="popover"]').popover({container: 'body', html: true});
        $container.find('input, textarea').placeholder();  

        // Loop through each item in the container area and add to the application
        _.forEach( $container.find('.single-item-display'), function( itemDisplay ){
            var $itemDisplay = $j(itemDisplay),
                item,
                view;

            // Create or update an model for this item
            log && log.trace(this.logClass + ': Add Item');
            item = this.items.add( $itemDisplay.data('modelJson'), {merge: true} );

            // Create a view for this item
            if( item ){
                log && log.trace(this.logClass + ': Add View');
                view = new dhweb.views.ItemDisplay({ el: $itemDisplay, model: item, source: source, hasProductZoom: hasProductZoom });                       
                this.views.add( view );
            }
        }, this);        

        log && log.debug( this.items.toString() );
    },

    getItem: function( itemNo ){
        log && log.debug(this.logClass + '.getItem(' + itemNo + ')');
        return this.items.getModelByItemNo( itemNo );
    },

    addView: function( view ){
        log && log.debug(this.logClass + '.addView()');
        this.views.add( view );
    },

    removeView: function( view )
    {
        log && log.debug(this.logClass + '.removeView()');
        this.views.remove( view );      
    },

    closeAllViews: function(){
        log && log.debug(this.logClass + '.closeAllViews()');
        this.views.each(function( view ){
            view.close();
        }, this);
    },

    getGreenCertContent: function( element ) {
        log && log.debug(this.logClass + '.getGreenCertContent()');

        // Make ajax call for content
        var $element = $j(element),
            targetUrl = $element.data('target-url'),
            content = $element.data('content');

        // Shortcut call if value is already set
        if( content !== undefined ){
            return content;
        }    

        this.greenCertIcon = $element;

        $j.ajax({
            url: targetUrl,
            type: 'POST',
            context: this,
            complete: function( jqXHR, textStatus ){
                log && log.debug(this.logClass + '.updateGreenIconContent()');

                var html = '',
                    $element = $j(jqXHR.responseText),
                    elements = $element.find('CertName'),
                    count = elements.length;

                for( var x = 0; x < count; x++ ) {
                    html += $j(elements[x]).html() + '<br/>';
                }

                this.greenCertIcon.attr('data-content', html);

                // If the popover is visible update it                
                if( this.greenCertIcon.data('bs.popover').tip().hasClass('in') ){
                    this.greenCertIcon.popover('show');    
                }                
            }            
        });

        return 'Loading';
    },

    getItemInventory: function( itemNo ) {
        log && log.debug(this.logClass + '.getItemInventory()');
        $j.getJSON(
            '/v4/asyncData?method=SearchInventory', 
            { 'item': itemNo }, 
            function (data) {
                _.forEach(data, function( item ) {
                    // Find the stock icon that was clicked and then update the adjacent inventory div
                    var $element = $j('.stock-icon.' + itemNo + '_' + item.branch).next('.inventory');
                    if( item.qty === 0 ){
                        if( !$element.text() ){
                            $element.text('-');    
                        }                        
                    } else {
                        $element.text( item.qty );
                    }
                }, this);
            }
        );        
    },

    /*
    params = {
        'itemNo': itemNo,
        'tagAdd': Comma delineated string of tag ID's,
        'tagNew': Comma delineated string of new tag names
    }
    */
    addToWatchlist: function( params, isUpdate ){
        log && log.debug(this.logClass + '.addToWatchlist( ' + params + ', ' + isUpdate + ' )');

        var defaults = {
            method: 'AddWatchlistItem',
            renderMode: 'BlankAsync',
            jsonReturnData: 'true',
            itemNumber: '-1',
            tagAdd: '',
            tagNew: ''
        };

        params = _.defaults( params, defaults );
        params.itemNumber = params.itemNo; // itemNumber is required for the watchlist calls

        $j.ajax({
            type: 'POST',
            url: '/v4/asyncData',
            data: params, 
            context: this,
            complete: function( jqXHR, textStatus ) {
                var $json = $j.parseJSON( jqXHR.responseText ),
                    itemModel = this.items.getModelByItemNo( params.itemNo ),
                    eventName = ( isUpdate ) ? dhweb.app.events.WATCH_LIST_ITEM_UPDATED() : dhweb.app.events.WATCH_LIST_ITEM_ADDED() ;

                // Hide all the Watch This Item Links that match that item number
                $j('.watchThisItemLink.item-no-' + params.itemNo).hide();
                $j('.stopWatchingLink.item-no-' + params.itemNo).show();                

                // Update the item model
                this.items.setAttrByItemNo( params.itemNo, 'isWatchlist', true );
                this.items.setAttrByItemNo( params.itemNo, 'tags', $json.itemTagsList );

                // Raise event
                dhweb.app.eventAggregator.trigger( eventName, {
                    'itemNo': params.itemNo,
                    'textStatus': textStatus,
                    'tagsJSON': $json.tagsList,
                    'isUpdate': isUpdate
                });
            }
        });
    },

    removeItemFromWatchlist: function( itemNo, confirm ) 
    {
        log && log.debug(this.logClass + '.removeItemFromWatchlist(' + itemNo + ', ' + confirm + ')');
        confirm = (confirm === undefined) ? true : confirm;

        if( confirm ){ 
            bootbox.dialog({
                message: 'Are you sure you want to remove this item from your Watch List?',
                title: 'Are you sure?',
                buttons: 
                {
                    no: {
                        label: 'Cancel',
                        className: 'btn-default'
                    },
                    yes: 
                    {
                        label: 'Remove',
                        className: 'btn-primary',
                        callback: $j.proxy(function() {
                            this._removeItemFromWatchlist( itemNo );
                        }, this)
                    }
                }
            });  
        } else {
            this._removeItemFromWatchlist( itemNo );
        }       
    },  

    _removeItemFromWatchlist: function( itemNo )
    {
        log && log.debug(this.logClass + '._removeItemFromWatchlist(' + itemNo + ')');

        $j.ajax({
            type: 'POST',
            url: '/v4/asyncData',
            data: 
            { 
                method: 'DeleteWatchlistItems',
                renderMode: 'BlankAsync',
                deletedItemNumbers: itemNo,
                jsonReturnData: 'true'
            },
            context: this,
            complete: function( jqXHR, textStatus ) {              
                var $json = $j.parseJSON(jqXHR.responseText);
                if( $json.success === 'true' )
                {
                    // There is a bulk removal call from the watchlist page, it does not use this method
                    // There should only ever be one item in this list but it pays to be safe
                    _.each( $json.items, function( itemNo ){
                        // Hide all the Remove Item from Watchlist links that match that item number
                        $j('.stopWatchingLink.item-no-' + itemNo).hide();              
                        $j('.watchThisItemLink.item-no-' + itemNo).show();

                         // Update isWatchlistItem hidden field
                        $j('.isWatchlistItem-' + itemNo).val(false);

                        // Update the item model
                        this.items.setAttrByItemNo( itemNo, 'isWatchlist', false );

                        // Raise correct events
                        dhweb.app.eventAggregator.trigger( dhweb.app.events.WATCH_LIST_ITEM_REMOVED(), {'tagsJSON': $json.tagsList} ); 
                    }, this);             
                }
            }
        });
    },
}, Backbone.Events);

$j(document).ready(function() {
    dhweb.app.itemController.initialize();
});