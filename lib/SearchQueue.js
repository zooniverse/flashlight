
var fbutil = require('./fbutil');

function SearchQueue(esc, reqRef, resRef, cleanupInterval) {
   this.esc = esc;
   this.inRef = reqRef;
   this.outRef = resRef;
   this.cleanupInterval = cleanupInterval;
   console.log('Queue started, IN: "%s", OUT: "%s"'.grey, fbutil.pathName(this.inRef), fbutil.pathName(this.outRef));
   setTimeout(function() {
      this.inRef.on('child_added', this._process, this);
   }.bind(this), 1000);
   this._nextInterval();
}

SearchQueue.prototype = {
   _process: function(snap) {
      var dat = snap.val();
      if( this._assertValidSearch(snap.key(), snap.val()) ) {
         // structure jquery into JSON object format expected by elasticsearch
         var queryObj = this._parseQueryObject(dat.query)
         this.esc.search(dat.index, dat.type, queryObj, dat.options)
            .on('data', function(data) {
               console.log('The search results:'.cyan, data);
               this._reply(snap.key(), JSON.parse(data));
            }.bind(this))
//         .on('done', function(){
            //always returns 0 right now
//         })
            .on('error', function(error){
               console.log(error);
               this._reply(snap.key(), { error: error });
            }.bind(this))
            .exec();
      }
   },

   _reply: function(key, results) {
      if( results.error ) {
         this._replyError(key, results.error);
      }
      else {
         console.log('result %s: %d hits'.yellow, key, results.hits.total);
         this._send(key, results);
      }
   },

   _assertValidSearch: function(key, props) {
      var res = true;
      if( typeof(props) !== 'object' || !props.index || !props.type || !props.query ) {
         console.log('Search query is not valid %s'.red, JSON.stringify(props));
         var error_message = 'search request must be a valid object with keys index, type, and query';
         this._replyError(key, { error: error_message });
      }
      return res;
   },

   _replyError: function(key, err) {
      this._send(key, { total: 0, error: err })
   },

   _send: function(key, data) {
      this.inRef.child(key).remove(this._abortOnWriteError.bind(this));
      //console.log('data being sent via response %s'.red, JSON.stringify(data));
      this.outRef.child(key).setWithPriority(data, new Date().valueOf());
   },

   _abortOnWriteError: function(err) {
      if( err ) {
         console.log((err+'').red);
         throw new Error('Unable to remove queue item, probably a security error? '+err);
      }
   },

   _housekeeping: function() {
      var self = this;
      // remove all responses which are older than CHECK_INTERVAL
      this.outRef.endAt(new Date().valueOf() - self.cleanupInterval).once('value', function(snap) {
         var count = snap.numChildren();
         if( count ) {
            console.warn('housekeeping: found %d orphans (removing them now) %s'.red, count, new Date());
            snap.forEach(function(ss) { ss.ref().remove(); });
         }
         self._nextInterval();
      });
   },

   _nextInterval: function() {
      var interval = this.cleanupInterval > 60000? 'minutes' : 'seconds';
      console.log('Next cleanup in %d %s'.grey, Math.round(this.cleanupInterval/(interval==='seconds'? 1000 : 60000)), interval);
      setTimeout(this._housekeeping.bind(this), this.cleanupInterval);
   },

   _getJson: function(str) {
       try {
           return JSON.parse(str);
       } catch (e) {
           return str
       }
   },

   _parseQueryObject: function(query) {
     console.log('The query object pre formatting:'.cyan, query);
     var queryObj = this._getJson(query)
     //var queryObj = { "query_string": { "query": '\\#' } };
     queryObj = (typeof(queryObj) === 'object' && queryObj.hasOwnProperty('query')) ? queryObj : { "query": queryObj };
     console.log('The query object post formatting:'.cyan, queryObj);
     return queryObj;
   }
};

exports.init = function(esc, url, reqPath, resPath, matchWholeWords, cleanupInterval) {
   new SearchQueue(esc, fbutil.fbRef(url, reqPath), fbutil.fbRef(url, resPath), matchWholeWords, cleanupInterval);
};
