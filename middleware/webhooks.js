const crypto = require('crypto');
const getRawBody = require('raw-body');
// IvanLinos: File modified because their "fix" doesnt work https://github.com/Shopify/shopify-express/issues/18

module.exports = function configureWithWebhook({ secret, shopStore }) {
  //return function createWebhookHandler(onVerified) {
    return async function withWebhook(request, response, next) {
      const { body: data } = request;
      const hmac = request.get('X-Shopify-Hmac-Sha256');
      const topic = request.get('X-Shopify-Topic');
      const shopDomain = request.get('X-Shopify-Shop-Domain');

      try {
        const rawBody = await getRawBody(request);
        const generated_hash = crypto
          .createHmac('sha256', secret)
          .update(rawBody)
          .digest('base64');

        if (generated_hash !== hmac) {
          response.status(401).send();
          //onVerified(new Error("Unable to verify request HMAC"));
          return;
        }

        shopStore.getShop({ shop: shopDomain }, (error, { accessToken }) => {
          if (error) {
            response.status(401).send();
            //onVerified(new Error("Couldn't fetch credentials for shop"));
            return;
          }

          request.body = rawBody.toString('utf8');
          request.webhook = { topic, shopDomain, accessToken };

          next();
          //response.status(200).send();
          //onVerified(null, request);
        });
      } catch(error) {
        response.send(error);
      }
    };
  //}
};