define({

    listenTo : {
        _getStapesObservableListeners : function () {
            if( typeof this._stapesObservableListeners === 'undefined' ) {
                this._stapesObservableListeners = [];
            }

            return this._stapesObservableListeners;
        },

        listenTo : function( other, event, callback ) {
            var listeners = this._getStapesObservableListeners();

            if( typeof other.addEventListener === 'function' ) {
                other.addEventListener( event, callback );
            } else if( typeof other.on === 'function' ) {
                other.on( event, callback );
            } else {
                throw new Error( 'The other object has no eventhandler attachement function' );
            }

            this._stapesObservableListeners.push({
                other : other,
                event : event,
                callback : callback
            });
        },

        stopListening : function ( other ) {
            var listeners = this._getStapesObservableListeners();

            var off = function( other, event, callback ) {

                if( typeof other.removeEventListener === 'function' ) {
                    other.removeEventListener( event, callback );
                } else if( typeof other.off === 'function' ) {
                    other.off( event, callback );
                }

            };

            for( var i in listeners ) {
                var listener = listeners[ i ];

                if( ( typeof other !== 'undefined' && listener.other === other ) || typeof other === 'undefined' ) {
                    off( listener.other);
                }
            }
        }
    }

});