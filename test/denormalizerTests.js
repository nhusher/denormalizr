/*globals describe:false, it: false */

import assert from "assert";
import denormalize from '../src/denormalize';
import * as schemas from './_schema';
import { arrayOf } from 'normalizr';

describe('Denormalizer', () => {
  const STATE = {
    accounts : {
      9999: {
        name : "Car Dealership",
        users: [3333]
      }
    },
    audiences: {
      1234: {
        name   : 'Burlington Audience',
        product: 4567,
        size   : 10000,
        states: [ 1 ]
      },
      3456: {
        name   : 'Virginia Audience',
        product: 9999,
        size   : 100,
        counts : {
          leads   : 30,
          invested: 4
        },
        states : [1, 2]
      }
    },
    states   : {
      1: {
        name: 'building',
        date: 5432
      },
      2: {
        name: 'build_requested',
        date: 4321
      }
    },
    products : {
      4567: {name: "Solar", account: 8910, icon: "solar.svg"},
      9999: {name: "Cars", account: 9999, icon: "cars.svg"}
    },
    users    : {
      3333: {name: "Nick"},
      4444: {name: "Derek"},
      5555: {name: "Tristan"}
    }
  };

  it('should get an entity given an id, schema, app state', () => {
    let entity = denormalize(STATE, schemas.product, 4567);
    assert.deepEqual(Object.assign({}, entity), Object.assign({}, STATE.products[4567], { account: { id: 8910 } }));
  });

  it('should return null if the entity is not found', () => {
    let entity = denormalize(STATE, schemas.product, 1234);
    assert.equal(entity, null);
  });

  it('should return the entity for normalized fields that do exist', () => {
    let entity = denormalize(STATE, schemas.audience, 1234);
    assert.deepEqual(
        Object.assign({}, entity),
        Object.assign({}, STATE.audiences[1234], {
          product: Object.assign({}, STATE.products[4567], {account: {id: 8910}}),
          states: [ STATE.states[1] ]
        }));
  });

  it('should let you pull all of an entity type', () => {
    let entities = denormalize(STATE, arrayOf(schemas.user));

    assert.deepEqual(entities, [{
      name: "Nick"
    }, {
      name: "Derek"
    }, {
      name: "Tristan"
    }]);
  });


  it('should let denormalize a list of entities', () => {
    let entities = denormalize(STATE, arrayOf(schemas.user), [3333,4444]);

    assert.deepEqual(entities, [{
      name: "Nick"
    }, {
      name: "Derek"
    }]);
  });

  it('should cache denormalization of the same entity', () => {
    let audiences = denormalize(STATE, arrayOf(schemas.audience));

    assert.strictEqual(audiences[0].states[0], audiences[1].states[0]);
  });

  it('should allow different calls to share a cache', () => {
    let cache = {};

    let users = denormalize(STATE, arrayOf(schemas.user), [3333], cache),
        account = denormalize(STATE, schemas.account, 9999, cache);

    assert.strictEqual(users[0], account.users[0]);
  });

  it('should have an option to turn off caching', () => {
    let audiences = denormalize(STATE, arrayOf(schemas.audience), null, false); // no cache

    assert.notStrictEqual(audiences[0].states[0], audiences[1].states[0]);
  });

  it('should throw if fields are missing', () => {
    assert.throws(() => {
      denormalize(STATE, schemas.audience);
    }, 'Argument id is required');
    assert.throws(() => {
      denormalize(STATE, null, 1234);
    }, 'Argument schema is required');
    assert.throws(() => {
      denormalize(null, schemas.audience, 1234);
    }, 'Argument entities is required');
  });
});

