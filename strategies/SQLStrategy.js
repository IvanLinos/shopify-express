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
    // IvanLinos: We need to make this until knex support "onduplicate" functionlaity
    let sqlRaw = '';
    switch (this.knex.client.config.client) {
      case 'mysql':
        sqlRaw = `INSERT IGNORE INTO shops (shopify_domain, access_token) VALUES ('${shop}', '${accessToken}')`;
        break;
      case 'pg':
        sqlRaw = `INSERT INTO shops (shopify_domain, access_token) VALUES ('${shop}', '${accessToken}') ON CONFLICT DO NOTHING`;
        break;
      case 'sqlite3':
        sqlRaw = `INSERT OR IGNORE INTO shops (shopify_domain, access_token) VALUES ('${shop}', '${accessToken}')`;
        break;
      default:
        return;
    }

    this.knex.raw(sqlRaw)
    .then(result => {
      return done(null, accessToken);
    });
  }

  getShop({ shop }, done) {
    this.knex('shops')
      .where('shopify_domain', shop)
      .then(result => {
        // We need to return [0] because the raw query result output + name the variable accordingly
        if (result[0].access_token) {
          let accessToken = result[0].access_token;
          return done(null, accessToken);
        }
      });
  }
};
