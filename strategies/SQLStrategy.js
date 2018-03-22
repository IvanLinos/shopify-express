const Knex = require('knex');

const defaultConfig = {
  dialect: 'sqlite3',
  useNullAsDefault: true,
  connection: {
    filename: './db.sqlite3',
  },
};

module.exports = class SQLStrategy {
  constructor(config = defaultConfig) {
    this.knex = Knex(config);
  }

  initialize() {
    return this.knex.schema
      .createTableIfNotExists('shops', table => {
        table.increments('id');
        table.string('shopify_domain');
        table.string('access_token');
        table.unique('shopify_domain');
      })
      .catch(err => {
        console.log(err);
      });
  }

  storeShop({ shop, accessToken, data = {} }, done) {
    (async () => {
      try {
        // knex does not support upsert for "on duplicate update" so this is a compatible method for all db types
        let err = null;
        const dbShop = await this.knex('shops').where({shopify_domain: shop}).select();
        let insertUpdate = dbShop[0] && dbShop[0].access_token && dbShop[0].access_token;

        if (!dbShop.length) {
          insertUpdate = await this.knex('shops').insert({shopify_domain: shop, access_token: accessToken});
        } else if (!dbShop[0].access_token) {
          insertUpdate = await this.knex('shops').where({shopify_domain: shop}).update({access_token : accessToken});
        }

        return done(err, insertUpdate ? accessToken : null);
      } catch (err) {
        return done(null, null);
      }
    })();
  }

  getShop({ shop }, done) {
    this.knex('shops')
      .where('shopify_domain', shop)
      .then(result => {
        // We need to return [0] because the raw query result output + name the variable accordingly
        return done(null, result && result[0] ? result[0].access_token : null);
      });
  }
};
