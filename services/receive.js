/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Messenger For Original Coast Clothing
 * https://developers.facebook.com/docs/messenger-platform/getting-started/sample-apps/original-coast-clothing
 */

"use strict";

const Curation = require("./curation"),
  Order = require("./order"),
  Lead = require("./lead"),
  Response = require("./response"),
  Care = require("./care"),
  Survey = require("./survey"),
  GraphApi = require("./graph-api"),
  i18n = require("../i18n.config"),
  branchLocations = require("../data/cairo locations with bitly link.json"),
  config = require("./config");

var waitingUsers = [];

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  var costs = new Array();
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0) costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function similarity(s1, s2) {
  var longer = s1;
  var shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  var longerLength = longer.length;
  if (longerLength == 0) {
    return 1.0;
  }
  return (
    (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength)
  );
}

function companySimilarityChecker(array, string) {
  return array.map((json) => {
    return {
      value: json.name,
      similarity: similarity(json.name, string)
    };
  });
}

function preparationSimilarityChecker(array, string) {
  return array.map((json) => {
    return {
      value: json.preparation,
      similarity: similarity(json.preparation, string)
    };
  });
}

module.exports = class Receive {
  constructor(user, webhookEvent, isUserRef) {
    this.user = user;
    this.webhookEvent = webhookEvent;
    this.isUserRef = isUserRef;
  }

  // Check if the event is a message or postback and
  // call the appropriate handler function
  handleMessage() {
    let event = this.webhookEvent;

    let responses;

    try {
      if (event.message) {
        let message = event.message;

        if (message.quick_reply) {
          responses = this.handleQuickReply();
        } else if (message.attachments) {
          responses = this.handleAttachmentMessage();
        } else if (message.text) {
          responses = this.handleTextMessage();
        }
      } else if (event.postback) {
        responses = this.handlePostback();
      } else if (event.referral) {
        responses = this.handleReferral();
      } else if (event.optin) {
        responses = this.handleOptIn();
      } else if (event.pass_thread_control) {
        responses = this.handlePassThreadControlHandover();
      }
    } catch (error) {
      console.error(error);
      responses = {
        text: `An error has occured: '${error}'. We have been notified and \
        will fix the issue shortly!`
      };
    }

    if (Array.isArray(responses)) {
      let delay = 0;
      for (let response of responses) {
        this.sendMessage(response, delay * 2000, this.isUserRef);
        delay++;
      }
    } else {
      this.sendMessage(responses, this.isUserRef);
    }
  }

  // Handles messages events with text
  // handle text msg for client
  handleTextMessage() {
    console.log(
      "Received text:",
      `${this.webhookEvent.message.text} for ${this.user.psid}`
    );

    let event = this.webhookEvent;

    console.log("waiting users : ", waitingUsers);
    console.log("event sender id : ", event.sender.id);
    // check greeting is here and is confident
    // let greeting = this.firstEntity(event.message.nlp, "greetings");
    if (event.message.nlp.traits["wit$greetings"]) {
      var greeting = event.message.nlp.traits["wit$greetings"][0];
    }

    console.log("greeting: " + greeting);
    let message = event.message.text.trim().toLowerCase();

    let response;

    if (
      (greeting && greeting.confidence > 0.8) ||
      message.includes("start over")
    ) {
      response = Response.genNuxMessage(this.user);
    } else if (waitingUsers.includes(event.sender.id)) {
      if (!event.quick_reply) {
        return;
      } else if (event.quick_reply.payload != "MENU") {
        return;
      }
    } else if (Number(message)) {
      response = Order.handlePayload("ORDER_NUMBER");
    } else if (message.includes("#")) {
      response = Survey.handlePayload("CSAT_SUGGESTION");
    } else if (message.includes(i18n.__("care.help").toLowerCase())) {
      let care = new Care(this.user, this.webhookEvent);
      response = care.handlePayload("CARE_HELP");
    } else {
      response = [
        Response.genText(
          i18n.__("fallback.any", {
            message: event.message.text
          })
        ),
        Response.genText("Cairo scan"),
        Response.genQuickReply(i18n.__("get_started.help"), [
          {
            title: i18n.__("menu.suggestion"),
            payload: "MENU"
          },
          {
            title: i18n.__("menu.help"),
            payload: "CARE_HELP"
          },
          {
            title: i18n.__("menu.Thanks"),
            payload: "THANKS"
          }
        ])
      ];
    }

    return response;
  }

  // Handles mesage events with attachments
  handleAttachmentMessage() {
    let response;

    // Get the attachment
    let attachment = this.webhookEvent.message.attachments[0];
    console.log("Received attachment:", `${attachment} for ${this.user.psid}`);

    response = Response.genQuickReply(i18n.__("fallback.attachment"), [
      {
        title: i18n.__("menu.help"),
        payload: "CARE_HELP"
      },
      {
        title: i18n.__("menu.start_over"),
        payload: "GET_STARTED"
      }
    ]);

    return response;
  }

  // Handles mesage events with quick replies
  handleQuickReply() {
    // Get the payload of the quick reply
    let payload = this.webhookEvent.message.quick_reply.payload;
    if (
      payload.includes("APPROVALS") ||
      payload.includes("COMPLAINTS") ||
      payload.includes("RESULT_TESTS") ||
      payload.includes("RESULT_XRAY") ||
      payload.includes("VISIT_DETAILS")
    ) {
      waitingUsers.push(this.webhookEvent.sender.id);
    }
    return this.handlePayload(payload);
  }

  // Handles postbacks events
  handlePostback() {
    let postback = this.webhookEvent.postback;
    // Check for the special Get Starded with referral
    let payload;
    if (postback.referral && postback.referral.type == "OPEN_THREAD") {
      payload = postback.referral.ref;
    } else if (postback.payload) {
      // Get the payload of the postback
      payload = postback.payload;
    }
    if (payload.trim().length === 0) {
      console.log("Ignore postback with empty payload");
      return null;
    }

    if (payload === "MENU" && waitingUsers.length > 0) {
      waitingUsers = waitingUsers.filter(
        (id) => id !== this.webhookEvent.sender.id
      );
      console.log(waitingUsers);
    }
    return this.handlePayload(payload.toUpperCase());
  }

  // Handles referral events
  handleReferral() {
    // Get the payload of the postback
    let type = this.webhookEvent.referral.type;
    if (type === "LEAD_COMPLETE" || type === "LEAD_INCOMPLETE") {
      let lead = new Lead(this.user, this.webhookEvent);
      return lead.handleReferral(type);
    }
    if (type === "OPEN_THREAD") {
      let payload = this.webhookEvent.referral.ref.toUpperCase();
      if (payload.trim().length === 0) {
        console.log("Ignore referral with empty payload");
        return null;
      }
      return this.handlePayload(payload);
    }
    console.log("Ignore referral of invalid type");
  }

  // Handles optins events
  handleOptIn() {
    let optin = this.webhookEvent.optin;
    // Check for the special Get Starded with referral
    let payload;
    if (optin.type === "notification_messages") {
      payload = "RN_" + optin.notification_messages_frequency.toUpperCase();
      this.sendRecurringMessage(optin.notification_messages_token, 5000);
      return this.handlePayload(payload);
    }
    return null;
  }

  handlePassThreadControlHandover() {
    let new_owner_app_id =
      this.webhookEvent.pass_thread_control.new_owner_app_id;
    let previous_owner_app_id =
      this.webhookEvent.pass_thread_control.previous_owner_app_id;
    let metadata = this.webhookEvent.pass_thread_control.metadata;
    if (config.appId === new_owner_app_id) {
      console.log("Received a handover event, but is not for this app");
      return;
    }
    const lead_gen_app_id = 413038776280800; // App id for Messenger Lead Ads
    if (previous_owner_app_id === lead_gen_app_id) {
      console.log(
        "Received a handover event from Lead Generation Ad will handle Referral Webhook Instead"
      );
      return;
    }
    // We have thread control but no context on what to do, default to New User Experience
    return Response.genNuxMessage(this.user);
  }

  handlePayload(payload) {
    console.log("Received Payload:", `${payload} for ${this.user.psid}`);

    let response;

    // Set the response based on the payload
    if (
      payload === "GET_STARTED" ||
      payload === "DEVDOCS" ||
      payload === "GITHUB"
    ) {
      response = Response.genNuxMessage(this.user);
    } else if (payload.includes("CELLTEK")) {
      response = Response.genText("celltek");
    } else if (payload.includes("MENU")) {
      // القائمة
      console.log("Handling MENU payload");
      response = Response.genQuickReply(i18n.__("get_started.menu"), [
        {
          title: i18n.__("menu.approvals"),
          payload: "APPROVALS"
        },
        {
          title: i18n.__("menu.complaints"),
          payload: "COMPLAINTS"
        },
        {
          title: i18n.__("menu.labsBranches"),
          payload: "LABS_BRANCHES"
        },
        {
          title: i18n.__("menu.radiologyBranches"),
          payload: "RADIOLOGY_BRANCHES"
        },
        {
          title: i18n.__("menu.contracts"),
          payload: "CONTRACTS"
        },
        {
          title: i18n.__("menu.preparations"),
          payload: "PREPARATIONS"
        },
        {
          title: i18n.__("menu.visitDetails"),
          payload: "VISIT_DETAILS"
        },
        {
          title: i18n.__("menu.resultTests"),
          payload: "RESULT_TESTS"
        },
        {
          title: i18n.__("menu.resultXray"),
          payload: "RESULT_XRAY"
        },
        {
          title: i18n.__("menu.prices"),
          payload: "RADIOLOGY_PRICES"
        }
      ]);
    } else if (payload.includes("RADIOLOGY_PRICES")) {
      // هل يوجد تأمين أو تعاقد؟
      response = Response.genQuickReply(i18n.__("questions.contract"), [
        {
          title: i18n.__("common.no_contract"),
          payload: "SHOW_RADIOLOGY-PRICES"
        },
        {
          title: i18n.__("common.yes"),
          payload: "NO"
        }
      ]);
    } else if (payload.includes("BOOKVISIT_QUESTION")) {
      //هل تريد حجز زيارة فى الفرع
      response = Response.genQuickReply(i18n.__("questions.bookVisit"), [
        {
          title: i18n.__("common.yes"),
          payload: "YES_BOOKVISIT"
        },
        {
          title: i18n.__("common.no"),
          payload: "NO"
        }
      ]);
    } else if (payload.includes("BOOK-HOME-VISIT_QUESTION")) {
      //هل تريد حجز زيارة منزلية؟
      response = Response.genQuickReply(i18n.__("questions.bookHomeVisit"), [
        {
          title: i18n.__("common.yes"),
          payload: "YES_BOOKVISIT"
        },
        {
          title: i18n.__("common.no"),
          payload: "NO"
        }
      ]);
    } else if (payload.includes("LABS_BRANCHES")) {
      // فروع كايرو سكان
      response = branchLocations.map((location) => {
        let branches =
          "المدينة : " +
          location["City/Locality"] +
          "\n" +
          "المنطقة : " +
          location.Address +
          "\n" +
          "العنوان : " +
          location["Address**"] +
          "\n" +
          "الرابط : " +
          location.location;
        return Response.genText(branches);
      });
    } else if (payload.includes("CT_CORONARY")) {
      // اسماء واسعار الأشعة
      response = Response.genText(i18n.__("prices_Radiology.CT_Coronary"));
    } else if (
      payload.includes("SHOW_RADIOLOGY-PRICES") ||
      payload.includes("X-RAY") ||
      payload.includes("OTHER_RADIOLOGY") ||
      payload.includes("PRESCRIOTION") ||
      payload.includes("PET-CT") ||
      payload.includes("LIVER_SCAN") ||
      payload.includes("MRI_HEART") ||
      payload.includes("CT_CORONARY")
    ) {
      let curation = new Curation(this.user, this.webhookEvent);
      response = curation.handlePayload(payload);
    } else if (payload.includes("BOOK_APPOINTMENT")) {
      response = [
        Response.genText(i18n.__("care.appointment")),
        Response.genText(i18n.__("care.end"))
      ];
    } else if (
      payload.includes("APPROVALS")||
      payload.includes("YES_BOOKVISIT")||
      payload.includes("NO")
      ) {
        //خدمة العملاء
      response = Response.genButtonTemplate(
        i18n.__("customer_service.redirection"),
        [
          {
            type: "postback",
            title: i18n.__("menu.suggestion"),
            payload: "MENU"
          }
        ]
      );
    } else if (payload.includes("COMPLAINTS")) {
      response = Response.genButtonTemplate(i18n.__("complaints.submit"), [
        {
          type: "postback",
          title: i18n.__("menu.suggestion"),
          payload: "MENU"
        }
      ]);
    } else if (payload.includes("RESULT_TESTS")) {
      response = Response.genButtonTemplate(i18n.__("test_results.enquire"), [
        {
          type: "postback",
          title: i18n.__("menu.suggestion"),
          payload: "MENU"
        }
      ]);
    } else if (payload.includes("RESULT_XRAY")) {
      response = Response.genButtonTemplate(
        i18n.__("radiology_results.enquire"),
        [
          {
            type: "postback",
            title: i18n.__("menu.suggestion"),
            payload: "MENU"
          }
        ]
      );
    } else if (payload.includes("VISIT_DETAILS")) {
      response = Response.genButtonTemplate(i18n.__("home_visit.submit"), [
        {
          type: "postback",
          title: i18n.__("menu.suggestion"),
          payload: "MENU"
        }
      ]);
    } else if (payload === "RN_WEEKLY") {
      response = {
        text: `[INFO]The following message is a sample Recurring Notification for a weekly frequency. This is usually sent outside the 24 hour window to notify users on topics that they have opted in.`
      };
    } else if (payload.includes("WHOLESALE_LEAD")) {
      let lead = new Lead(this.user, this.webhookEvent);
      response = lead.handlePayload(payload);
    } else {
      response = {
        text: `This is a default postback message for payload: ${payload}!`
      };
    }

    return response;
  }

  handlePrivateReply(type, object_id) {
    let welcomeMessage =
      i18n.__("get_started.welcome") + ". " + i18n.__("get_started.help");

    let response = Response.genQuickReply(welcomeMessage, [
      {
        title: i18n.__("menu.suggestion"),
        payload: "MENU"
      },
      {
        title: i18n.__("menu.help"),
        payload: "CARE_HELP"
      }
    ]);

    let requestBody = {
      recipient: {
        [type]: object_id
      },
      message: response
    };
    GraphApi.callSendApi(requestBody);
  }

  sendMessage(response, delay = 0, isUserRef) {
    // Check if there is delay in the response
    if (response === undefined || response === null) {
      return;
    }
    if ("delay" in response) {
      delay = response["delay"];
      delete response["delay"];
    }
    // Construct the message body
    let requestBody = {};
    if (isUserRef) {
      // For chat plugin
      requestBody = {
        recipient: {
          user_ref: this.user.psid
        },
        message: response
      };
    } else {
      requestBody = {
        recipient: {
          id: this.user.psid
        },
        message: response
      };
    }

    // Check if there is persona id in the response
    if ("persona_id" in response) {
      let persona_id = response["persona_id"];
      delete response["persona_id"];
      if (isUserRef) {
        // For chat plugin
        requestBody = {
          recipient: {
            user_ref: this.user.psid
          },
          message: response,
          persona_id: persona_id
        };
      } else {
        requestBody = {
          recipient: {
            id: this.user.psid
          },
          message: response,
          persona_id: persona_id
        };
      }
    }
    // Mitigate restriction on Persona API
    // Persona API does not work for people in EU, until fixed is safer to not use
    delete requestBody["persona_id"];

    setTimeout(() => GraphApi.callSendApi(requestBody), delay);
  }

  sendRecurringMessage(notificationMessageToken, delay) {
    console.log("Received Recurring Message token");
    let requestBody = {},
      response,
      curation;
    //This example will send summer collection
    curation = new Curation(this.user, this.webhookEvent);
    response = curation.handlePayload("CURATION_BUDGET_50_DINNER");
    // Check if there is delay in the response
    if (response === undefined) {
      return;
    }
    requestBody = {
      recipient: {
        notification_messages_token: notificationMessageToken
      },
      message: response
    };

    setTimeout(() => GraphApi.callSendApi(requestBody), delay);
  }
  firstEntity(nlp, name) {
    return nlp && nlp.entities && nlp.entities[name] && nlp.entities[name][0];
  }

  handleReportLeadSubmittedEvent() {
    let requestBody = {
      custom_events: [
        {
          _eventName: "lead_submitted"
        }
      ],
      advertiser_tracking_enabled: 1,
      application_tracking_enabled: 1,
      page_id: config.pageId,
      page_scoped_user_id: this.user.psid,
      logging_source: "messenger_bot",
      logging_target: "page"
    };
    try {
      GraphApi.callAppEventApi(requestBody);
    } catch (error) {
      console.error("Error while reporting lead submitted", error);
    }
  }
};
