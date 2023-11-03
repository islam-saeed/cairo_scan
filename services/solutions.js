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
  i18n = require("../i18n.config");

module.exports = class Solutions {
  static genAgentRating(solutions) {
      let response = Response.genQuickReply(i18n.__("order.prompt"), [
        {
            title: i18n.__("order.account"),
            payload: "LINK_ORDER"
          },
    ]

    );

    // This is triggered 4 sec after comming back from talking with an agent
    response.delay = "4000";

    return response;
  }

  static handlePayload(payload) {
    let response;

      switch (payload) {
          case "solutions":
         response = [
        Response.genButtonTemplate(i18n.__("solutions.title"), [
          {
            title: i18n.__("solutions.omnichannel_marketing"),
            payload:"omnichannel_marketing",
          },
            {
            title: i18n.__("solutions.omnichannel_customer"),
            payload:"omnichannel_customer",
          },
        ])
      ];      
          // {
          //   title: i18n.__("menu.suggestion"),
          //   payload: "CURATION"
          // },
          // {
          //   title: i18n.__("menu.help"),
          //   payload: "CARE_HELP"
          // },
          // {
          //   title: i18n.__("menu.product_launch"),
          //   payload: "PRODUCT_LAUNCH"
          // }
        ;
    }

    return response;
  }
};
