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

    switch (payload) {
      case "SHOW_RADIOLOGY-PRICES":
        response =Response.genQuickReply(i18n.__("names_Radiology.message"), [      
          {
            title: i18n.__("names_Radiology.X-ray"),
            payload: "X-RAY"
          }, 
          {
            title: i18n.__("names_Radiology.CT_Coronary"),
            payload: "CT_CORONARY"
          },  
          {
            title: i18n.__("names_Radiology.MRI_Heart"),
            payload: "MRI_HEART"
          }, 
          {
            title: i18n.__("names_Radiology.Liver_Scan"),
            payload: "LIVER_SCAN"
          }
         
        ])
      
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
