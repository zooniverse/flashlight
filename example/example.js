/* example.js
 *************************************/
(function ($) {
   "use strict";

   var URL = 'https://panoptes-comments.firebaseio.com';
   var token = 'FIREBASE_TOKEN_GOES_HERE';

   //auth a connection to firebase
   var ref = new Firebase(URL);
   ref.auth(token, function(error, result) {
     if (error) {
       console.log("Login Failed!", error);
     } else {
       console.log("Authenticated successfully to firebase");
       //console.log("Auth expires at:", new Date(result.expires * 1000));
     }
   });

   // handle form submits
   $('form').on('submit', function(e) {
      e.preventDefault();
      var $form = $(this);
      var term = $form.find('[name="term"]').val();
      var words = $form.find('[name="words"]').is(':checked');
      if( term ) {
         doSearch($form.find('[name="index"]').val(), $form.find('[name="type"]:checked').val(), buildQuery(term, words));
      }
      else {
         $('#results').text('');
      }
   });

   // display search results
   function doSearch(index, type, query) {
     var ref = new Firebase(URL + '/search');
     var key = ref.child('request').push({ index: index, type: type, query: query }).name();
     console.log('search', key, { index: index, type: type, query: query });
     ref.child('response/'+key).on('value', showResults);
   }

   function showResults(snap) {
      if( snap.val() === null ) { return; } // wait until we get data
      setTimeout(function() {
        console.log('sleeping');
        var dat = snap.val();
        console.log('result', snap.name(), dat);
        snap.ref().off('value', showResults);
        snap.ref().remove();
        var $pair = $('#results')
           .text(JSON.stringify(dat, null, 2))
           .add( $('#total').text(dat.total) )
           .removeClass('error zero');
        if( dat.error ) {
           $pair.addClass('error');
        }
        else if( dat.total < 1 ) {
           $pair.addClass('zero');
        }
      }.bind(this), 500);
   }

   function buildQuery(term, words) {
      // See this tut for more query options:
      // http://okfnlabs.org/blog/2013/07/01/elasticsearch-query-tutorial.html#match-all--find-everything
      return {
         'query_string': { query: makeTerm(term, words) }
      };
   }

   function makeTerm(term, matchWholeWords) {
      if( !matchWholeWords ) {
         if( !term.match(/^\*/) ) { term = '*'+term; }
         if( !term.match(/\*$/) ) { term += '*'; }
      }
      return term;
   }

   // display raw data for reference
   new Firebase(URL).on('value', setRawData);
   function setRawData(snap) {
      $('#raw').text(JSON.stringify(snap.val(), null, 2));
   }
})(jQuery);
