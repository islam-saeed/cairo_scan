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

// Imports dependencies
const Response = require("./response"),
  config = require("./config"),
  i18n = require("../i18n.config");

module.exports = class Curation {
  constructor(user, webhookEvent) {
    this.user = user;
    this.webhookEvent = webhookEvent;
  }

  handlePayload(payload) {
    let response;
    let outfit;
var bookVisit= [
  {
    title: i18n.__("questions.bookVisit"),
    payload: "BOOKVISIT_QUESTION"
  },
  {
    title: i18n.__("questions.bookHomeVisit"),
    payload: "BOOK-HOME-VISIT_QUESTION"
  }
]

    switch (payload) {   
      case "X-RAY1": // اشعة سينية
        response = Response.genQuickReply(i18n.__("prices_Radiology.X-ray1"),
        bookVisit
        );

        break;
  
      case "X-RAY2": // اشعة سينية
        response = Response.genQuickReply(i18n.__("prices_Radiology.X-ray2"),
        bookVisit
        );

        break;
  
      case "X-RAY3": // اشعة سينية
        response = Response.genQuickReply(i18n.__("prices_Radiology.X-ray3"),
        bookVisit
        );

        break;
  
      case "X-RAY4": // اشعة سينية
        response = Response.genQuickReply(i18n.__("prices_Radiology.X-ray4"),
        bookVisit
        );

        break;
  
      case "X-RAY5": // اشعة سينية
        response = Response.genQuickReply(i18n.__("prices_Radiology.X-ray5"),
        bookVisit
        );

        break;
  
      case "X-RAY6": // اشعة سينية
        response = Response.genQuickReply(i18n.__("prices_Radiology.X-ray6"),
        bookVisit
        );

        break;
      case "CR1": // اشعة سينية
        response = Response.genQuickReply(i18n.__("prices_Radiology.CR1"),
        bookVisit
        );

        break;
      case "CR2": // اشعة سينية
        response = Response.genQuickReply(i18n.__("prices_Radiology.CR2"),
        bookVisit
        );

        break;
      case "CT1": // اشعة سينية
        response = Response.genQuickReply(i18n.__("prices_Radiology.CT1"),
        bookVisit
        );

        break;
      case "CT2": // اشعة سينية
        response = Response.genQuickReply(i18n.__("prices_Radiology.CT2"),
        bookVisit
        );

        break;
      case "CT3": // اشعة سينية
        response = Response.genQuickReply(i18n.__("prices_Radiology.CT3"),
        bookVisit
        );

        break;
      case "CT4": // اشعة سينية
        response = Response.genQuickReply(i18n.__("prices_Radiology.CT4"),
        bookVisit
        );

        break;
  
        response = Response.genButtonTemplate(
          i18n.__("customer_service.prescription"),
          [
            {
              type: "postback",
              title: i18n.__("menu.suggestion"),
              payload: "MENU"
            }
          ]
        );

        break;

        // Build the recommendation logic here
        outfit = `${this.user.gender}-${this.randomOutfit()}`;
        response = Response.genRecurringNotificationsTemplate(
          `${config.appUrl}/looks/${outfit}.jpg`,
          i18n.__("curation.productLaunchTitle"),
          "WEEKLY",
          "12345"
        );
        break;
    }

    return response;
  }

  genCurationResponse(payload) {
    let occasion = payload.split("_")[3].toLowerCase();
    let budget = payload.split("_")[2].toLowerCase();
    let outfit = `${this.user.gender}-${occasion}`;

    let buttons = [
      Response.genWebUrlButton(
        i18n.__("curation.shop"),
        `${config.shopUrl}/products/${outfit}`
      ),
      Response.genPostbackButton(
        i18n.__("curation.show"),
        "CURATION_OTHER_STYLE"
      )
    ];

    if (budget === "50") {
      buttons.push(
        Response.genPostbackButton(i18n.__("curation.sales"), "CARE_SALES")
      );
    }

    let response = Response.genGenericTemplate(
      `${config.appUrl}/looks/${outfit}.jpg`,
      i18n.__("curation.title"),
      i18n.__("curation.subtitle"),
      buttons
    );

    return response;
  }

  randomOutfit() {
    let occasion = ["work", "party", "dinner"];
    let randomIndex = Math.floor(Math.random() * occasion.length);

    return occasion[randomIndex];
  }
};
