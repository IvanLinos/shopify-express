const crypto = require('crypto');
const getRawBody = require('raw-body');

module.exports = function createWithWebhook({ secret, shopStore }) {
    return function withWebhook(request, response, next) {
        const { body: data } = request;
        const hmac = request.get('X-Shopify-Hmac-Sha256');
        const topic = request.get('X-Shopify-Topic');
        const shopDomain = request.get('X-Shopify-Shop-Domain');

        try {
            getRawBody(request)
            .then(buf => {
                const generated_hash = crypto
                .createHmac('sha256', secret)
                .update(buf)
                .digest('base64');

                if (generated_hash !== hmac) {
                    response.status(401).send();
                    throw new Error("Unable to verify request HMAC");
                    return;
                }

                shopStore.getShop({ shop: shopDomain }, (error, { access_token }) => {
                    if (error) {
                        response.status(401).send();
                        throw new Error("Couldn't fetch credentials for shop");
                        return;
                    }

                    request.body = buf.toString('utf8');
                    request.webhook = { topic, shopDomain, access_token };

                    //response.status(200).send();
                    next();
                });
            })
            .catch(err => {
                console.log(err);
            });
        } catch(error) {
            response.send(error);
        }
    };
};