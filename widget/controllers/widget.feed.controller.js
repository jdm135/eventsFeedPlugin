'use strict';

(function (angular) {
  angular.module('eventsFeedPluginWidget')
    .controller('WidgetFeedCtrl', ['$scope', 'DataStore', 'TAG_NAMES', 'STATUS_CODE', 'Location', 'LAYOUTS', 'CalenderFeedApi', 'PAGINATION', 'Buildfire','$rootScope',
      function ($scope, DataStore, TAG_NAMES, STATUS_CODE, Location, LAYOUTS, CalenderFeedApi, PAGINATION, Buildfire,$rootScope) {
        /*variable declaration*/
        var WidgetFeed = this;
        var currentFeedUrl = "";
        var currentDate = new Date();
        var formattedDate = moment(currentDate).format("MMM") + " " + currentDate.getFullYear() + ", " + currentDate.getDate();
        var timeStampInMiliSec = +new Date("'" + formattedDate + "'");
        $rootScope.selectedDate = timeStampInMiliSec;

        /*Variable declaration to store the base or initial data*/
        $scope.toggles = [{state: true}, {state: false}, {state: true}];
        $scope.events = [];
        WidgetFeed.googleCalEvent = {
          'summary': '',
          'location': '',
          'description': '',
          'start': {
            'dateTime': '',
            'timeZone': ''
          },
          'end': {
            'dateTime': '',
            'timeZone': ''
          },
          'recurrence': [
            'RRULE:FREQ=DAILY;COUNT=2'
          ],
          'attendees': [
            {'email': 'lpage@example.com'}
          ],
          'reminders': {
            'useDefault': false,
            'overrides': [
              {'method': 'email', 'minutes': 24 * 60}
            ]
          }
        };

        WidgetFeed.swiped = [];
        WidgetFeed.data = null;
        WidgetFeed.events = [];
        WidgetFeed.busy = false;
        WidgetFeed.offset = 0;
        /*This object is storing the base data for iCal calendar*/
        WidgetFeed.iCalEvent = {
          VERSION: 2.0,
          PRODID: "",
          "BEGIN": "VEVENT",
          DTSTAMP: "20151012T130000Z",
          "ORGANIZER;CN=Organizer": "MAILTO:Organizer e-mail",
          STATUS: "CONFIRMED",
          UID: "ATE1443440406",
          DTSTART: "20151012T130000Z",
          DTEND: "20151012T150000Z",
          SUMMARY: "Summary of the event",
          DESCRIPTION: "Description of the event",
          "X-ALT-DESC;FMTTYPE=text/html": "Description of the event",
          LOCATION: "Location of the event",
          END: "VEVENT"
        };

        /*
         * Fetch user's data from datastore
         */
        var init = function () {
          var success = function (result) {
                WidgetFeed.data = result.data;
                if (!WidgetFeed.data.content)
                  WidgetFeed.data.content = {};
                if (!WidgetFeed.data.design)
                  WidgetFeed.data.design = {};
                if (!WidgetFeed.data.design.itemDetailsLayout) {
                  WidgetFeed.data.design.itemDetailsLayout = LAYOUTS.itemDetailsLayout[0].name;
                }
                if (WidgetFeed.data.content.feedUrl)
                  currentFeedUrl = WidgetFeed.data.content.feedUrl;
              }
              , error = function (err) {
                if (err && err.code !== STATUS_CODE.NOT_FOUND) {
                  console.error('Error while getting data', err);
                }
              };
          DataStore.get(TAG_NAMES.EVENTS_FEED_INFO).then(success, error);
        };

        /*This is used to fetch the data from the Calendar API*/
        var getFeedEvents = function (url, date) {
          Buildfire.spinner.show();
          var success = function (result) {
                Buildfire.spinner.hide();
                console.log("??????????????????????", result);
                WidgetFeed.events = WidgetFeed.events.length ? WidgetFeed.events.concat(result.events) : result.events;
                WidgetFeed.offset = WidgetFeed.offset + PAGINATION.eventsCount;
                if (WidgetFeed.events.length < result.totalEvents) {
                  WidgetFeed.busy = false;
                }
              }
              , error = function (err) {
                Buildfire.spinner.hide();
                console.error('Error In Fetching events', err);
              };
          CalenderFeedApi.getFeedEvents(url, date, WidgetFeed.offset).then(success, error);
        };
        /*This method will give the current date*/
        $scope.today = function () {
          $scope.dt = new Date();
        };
        /**
         * DataStore.onUpdate() is bound to listen any changes in datastore
         */
        var onUpdateCallback = function (event) {
          if (event && event.tag === TAG_NAMES.EVENTS_FEED_INFO) {
            WidgetFeed.data = event.data;
            if (!WidgetFeed.data.design)
              WidgetFeed.data.design = {};
            if (!WidgetFeed.data.content)
              WidgetFeed.data.content = {};
            if (!WidgetFeed.data.design.itemDetailsLayout) {
              WidgetFeed.data.design.itemDetailsLayout = LAYOUTS.itemDetailsLayout[0].name;
            }

            if (!WidgetFeed.data.content.feedUrl) {
              WidgetFeed.events = [];
              WidgetFeed.busy = false;
            } else if (currentFeedUrl != WidgetFeed.data.content.feedUrl) {
              getFeedEvents(WidgetFeed.data.content.feedUrl, timeStampInMiliSec);
            }
          }
        };
        DataStore.onUpdate().then(null, null, onUpdateCallback);

        /*This method is to use to plot the event on to calendar*/
        $scope.getDayClass = function (date, mode) {
          if (mode === 'day') {
            var dayToCheck = new Date(date).setHours(0, 0, 0, 0);

            for (var i = 0; i < $scope.events.length; i++) {
              var currentDay = new Date($scope.events[i].date).setHours(0, 0, 0, 0);

              if (dayToCheck === currentDay) {
                return $scope.events[i].status;
              }
            }
          }

          return '';
        };

        /*This method is use to swipe left and right the event*/
        WidgetFeed.addEvents = function (e, i, toggle) {
          toggle ? WidgetFeed.swiped[i] = true : WidgetFeed.swiped[i] = false;
        };

        /*This method is called when we click to add an event to native calendar*/
        WidgetFeed.addEventsToCalendar = function (event) {
          //console.log(Buildfire.context.device.platform);
          WidgetFeed.Keys = Object.keys(event);
          WidgetFeed.startTimeZone = WidgetFeed.Keys[0].split('=');
          WidgetFeed.endTimeZone = WidgetFeed.Keys[1].split('=');
          if (Buildfire.context.device.platform == 'android') {     //It will check if the device is android
            WidgetFeed.googleCalEvent.summary = event.SUMMARY;
            WidgetFeed.googleCalEvent.description = event.DESCRIPTION;
            WidgetFeed.googleCalEvent.start.dateTime = event[WidgetFeed.Keys[0]];
            WidgetFeed.googleCalEvent.start.timeZone = WidgetFeed.startTimeZone[1] == 'DATE' ? "" : WidgetFeed.startTimeZone[1];
            WidgetFeed.googleCalEvent.end.dateTime = event[WidgetFeed.Keys[1]];
            WidgetFeed.googleCalEvent.end.timeZone = WidgetFeed.endTimeZone[1] == 'DATE' ? "" : WidgetFeed.endTimeZone[1];
          }
          else if (Buildfire.context.device.platform == 'web') { //It will check if the device is web
            WidgetFeed.googleCalEvent.summary = event.SUMMARY;
            WidgetFeed.googleCalEvent.description = event.DESCRIPTION;
            WidgetFeed.googleCalEvent.start.dateTime = event[WidgetFeed.Keys[0]];
            WidgetFeed.googleCalEvent.start.timeZone = WidgetFeed.startTimeZone[1] == 'DATE' ? "" : WidgetFeed.startTimeZone[1];
            WidgetFeed.googleCalEvent.end.dateTime = event[WidgetFeed.Keys[1]];
            WidgetFeed.googleCalEvent.end.timeZone = WidgetFeed.endTimeZone[1] == 'DATE' ? "" : WidgetFeed.endTimeZone[1];
            var icsMSG = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Our Company//NONSGML v1.0//EN\nBEGIN:VEVENT\nUID:me@google.com\nDTSTAMP:20120315T170000Z\nATTENDEE;CN=My Self ;RSVP=TRUE:MAILTO:me@gmail.com\nORGANIZER;CN=Me:MAILTO::me@gmail.com\nDTSTART:20120315T170000Z\nDTEND:20120315T170000Z\nLOCATION:Delhi\nSUMMARY:Our Meeting Office\nEND:VEVENT\nEND:VCALENDAR";

            window.open("data:text/calendar;charset=utf8," + escape(icsMSG));
          }
          else if (Buildfire.context.device.platform == 'ios') { //It will check if the device is ios
          }
          console.log("Web", WidgetFeed.googleCalEvent);
        };

        /*This method is used to get the event from the date where we clicked on calendar*/
        WidgetFeed.getEventDate = function(date)
        {
          WidgetFeed.events = [];
          WidgetFeed.offset=0;
          WidgetFeed.busy = false;
          formattedDate = moment(date).format("MMM") + " " + date.getFullYear() + ", " + date.getDate();
          timeStampInMiliSec = +new Date("'" + formattedDate + "'");
          $rootScope.selectedDate = timeStampInMiliSec;
          WidgetFeed.loadMore();
        };

        /*This method is used to load the from Datastore*/
        WidgetFeed.loadMore = function () {
          if (WidgetFeed.busy) return;
          WidgetFeed.busy = true;
          if (WidgetFeed.data.content.feedUrl)
            getFeedEvents(WidgetFeed.data.content.feedUrl, timeStampInMiliSec);
        };

        /**
         * init() function invocation to fetch previously saved user's data from datastore.
         */

        init();

        $scope.today();

        $scope.$on("$destroy", function () {
          DataStore.clearListener();
        });
      }]);
})(window.angular);