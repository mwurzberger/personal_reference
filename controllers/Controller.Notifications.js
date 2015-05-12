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

dhweb.app.notificationController = _.extend({
	logClass: 'dhweb.app.notificationController',
	viewContainer: null,
	
	initialize: function()
	{
		log && log.debug(this.logClass + '.initialize()');

		this.viewContainer = new Backbone.ChildViewContainer(); // https://github.com/marionettejs/backbone.babysitter
		this.modelList = {};       
	},

	setNotification: function( notification )
	{
		log && log.debug(this.logClass + '.setNotification()');
		log && log.trace( notification.toString() );

		// Convert the notification to format accepted by the server
		// Branches can be a comma-delimited list of branch names or numbers
		var postData = {
			method: 'AddUpdateInstockNotification',
        	itemNumber: notification.getItemNo(),
        	isEmail: notification.isEmailAlert(),
        	isOnline: notification.isOnlineAlert(),
        	emailAddress: notification.getEmailAddress(),
        	branches: _.chain( notification.getBranches() ).filter( 'selected' ).pluck( 'branchNumber' ).value().join(',')
		};
		log && log.trace(this.logClass + ': postData');
		log && log.trace( postData );

		$j.ajax({
            type: 'POST',
            url: '/v4/asyncData',
            data: postData, 
            context: this,
            complete:  function( jqXHR, textStatus )
            {                
            	log && log.debug(this.logClass + '.AddUpdateInstockNotification() AjaxComplete');
                var $json = $j.parseJSON(jqXHR.responseText),
                	msg = 'Default Message';                

                if( $json.success ){
                	msg = 'Notification Set';
                } else {
                	msg = 'Error Setting Notification: ' + $json.message;
                }
                
                this.trigger('notification:set:' + notification.getItemNo(), [ $json.success, msg ]);
             	this.trigger('notification:set');   
            }
        });
	},

	removeNotification: function( itemNumber, shouldConfirm )
	{
		shouldConfirm = ( shouldConfirm === undefined ) ? true : shouldConfirm ;
		log && log.debug(this.logClass + '.removeNotification(' + itemNumber + ', ' + shouldConfirm + ')');

        if( shouldConfirm ){
            bootbox.dialog({
                message: 'Are you sure you want to stop notifictaions for this item?',
                title: 'Are you sure?',
                buttons: 
                {
                    no: {
                        label: 'Cancel',
                        className: 'btn-default',
                        callback: $j.proxy(function(){
                            this.trigger('notification:remove:canceled', [ itemNumber, 'User canceled removal process.' ]);                        
                        }, this)
                    },
                    yes: 
                    {
                        label: 'Remove',
                        className: 'btn-primary',
                        callback: $j.proxy(function() {
                            // Wrapped in closure in order to pass itemNumber
                            this._removeNotification( itemNumber );
                        }, this)
                    }
                }
            });
        } else {
            this._removeNotification( itemNumber );
        }		
	},	

	_removeNotification: function( itemNumber )
	{
		log && log.debug(this.logClass + '._removeNotification(' + itemNumber + ')');

		var postData = {
			method: 'RemoveInstockNotification',
            	itemNumber: itemNumber
		};
		log && log.trace(this.logClass + ': postData');
		log && log.trace( postData );

		$j.ajax({
            type: 'POST',
            url: '/v4/asyncData',
            data: postData, 
            context: this,
            complete:  function( jqXHR, textStatus ) {                
            	log && log.debug(this.logClass + '._removeNotification(', itemNumber, ') AjaxComplete');
                var $json = $j.parseJSON(jqXHR.responseText),
                	msg = 'Default Message';                

                if( $json.success ){
                	msg = 'Notification Successfully Removed';
                } else {
                	msg = 'Error Setting Notification: ' + $json.message;
                }
                
                this.trigger('notification:remove:' + itemNumber, [ $json.success, msg ]);
                this.trigger('notification:remove');
            }
        });
	},

	// Open up an add/edit block for notifications on a single item
	openNotificationUpdateView: function( itemNumber, $el )
	{
		log && log.debug(this.logClass + '.openNotificationUpdateView(', itemNumber, ')');

        // Test if $el contains an active view before adding another
        if( $el.find('.notify-me-block').length > 0 ){
            return false;
        }

		var view = null,
            postData = {
    			method: 'GetItemNotification',
                itemNumber: itemNumber
    		};

		log && log.trace(this.logClass + ': postData');
		log && log.trace( postData );

		// Retrieve the matching model for this item
		$j.ajax({
            type: 'POST',
            url: '/v4/asyncData',
            data: postData, 
            context: this,
            complete:  function( jqXHR, textStatus )
            {        
            	log && log.debug(this.logClass + '.openNotificationUpdateView(', itemNumber, ') AjaxComplete');     
                var $json = $j.parseJSON(jqXHR.responseText),
                	notification = new dhweb.models.Notification( $json );

                view = new dhweb.views.ItemNotificationBlockView({ el: $el, model: notification  });

                // Create a view for this item using the passed $el location
				this.viewContainer.add( view );
				this.modelList[''] = notification;
            }
        });

        return view;
	},

    closeView: function( view )
    {
        log && log.debug(this.logClass + '.closeView()');
        this.viewContainer.remove( view );
        //TODO remove the model as wellthis.modelList.        
    },

    closeAllViews: function(){
        log && log.debug(this.logClass + '.closeAllViews()');
        this.viewContainer.each(function( view ){
            view.close();
        }, this);
    }
}, Backbone.Events);

$j(document).ready(function() {
    dhweb.app.notificationController.initialize();
});