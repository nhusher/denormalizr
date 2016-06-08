/*globals describe:false, it: false */

import assert from "assert";
import { denormalize, isResolved, resolved } from '../src/denormalizer';
import { arrayOf, unionOf, Schema } from 'normalizr';

const reify = o => Object.assign({}, o);

describe('Denormalizer', () => {
  const schema = {
    human: new Schema('humans', { idAttribute: 'employeeId' }),
    robot: new Schema('robots', { idAttribute: 'designation' }),
    company: new Schema('companies', { idAttribute: 'employerId' }),
    planet: new Schema('planets'),
    spacecraft: new Schema('spacecraft')
  };

  schema.company.define({
    members: arrayOf(unionOf({
      robot: schema.robot,
      human: schema.human
    }, {
      schemaAttribute: 'type'
    })),
    location: schema.planet
  });

  schema.spacecraft.define({
    locationInfo: { origin: schema.planet }
  });

  const state = {
    humans: {
      1: {
        employeeId: 1,
        name: 'Phillip Fry',
        type: 'human'
      },
      3: {
        employeeId: 3,
        name: 'Zapp Brannigan',
        type: 'human'
      }
    },
    robots: {
      1: {
        designation: 1,
        name: 'Bender',
        type: 'robot'
      }
    },
    companies: {
      1: {
        employerId: 1,
        name: 'Planet Express',
        location: 'earth',
        members: [
          { id: 1, schema: 'human' },
          { id: 1, schema: 'robot' },
          { id: 2, schema: 'human' }
        ]
      },
      2: {
        employerId: 2,
        name: 'Mom\'s Friendly Robot Factory',
        location: 'earth'
      }
    },
    planets: {
      'earth': {
        id: 'earth',
        name: 'Earth'
      }
    },
    spacecraft: {
      1: {
        id: 1,
        name: 'Planet Express Ship',
        locationInfo: {
          origin: 'earth'
        }
      }
    }
  };

  it('should get an entity given an id, schema, app state', () => {
    let entity = denormalize(schema.human, state, 1);
    assert.deepEqual(entity, state.humans[1]);
  });

  it('should return an unresoled entity if the entity is not found', () => {
    let entity = denormalize(schema.human, state, 2);
    assert.deepEqual(entity, { employeeId: 2, [resolved]: false });
    assert.equal(isResolved(entity), false);
  });

  it('should transparently denormalize', () => {
    let entity = denormalize(schema.company, state, 1);

    assert.deepEqual(
      reify(entity),
      {
        employerId: 1,
        name: 'Planet Express',
        location: {
          id: 'earth',
          name: 'Earth'
        },
        members: [
          { employeeId: 1, name: 'Phillip Fry', type: 'human' },
          { designation: 1, name: 'Bender', type: 'robot' },
          { employeeId: 2, [resolved]: false }
        ]
      });
  });

  it('should let denormalize a list of entities', () => {
    let entities = denormalize(arrayOf(schema.human), state, [1,3]);

    assert.deepEqual(entities, [{
      employeeId: 1,
        name: 'Phillip Fry',
        type: 'human'
    }, {
      employeeId: 3,
        name: 'Zapp Brannigan',
        type: 'human'
    }]);
  });

  it('should allow empty fields', () => {
    let moms = denormalize(schema.company, state, 2);
    // should not throw
    assert.deepEqual(reify(moms), {
      employerId: 2,
      name: 'Mom\'s Friendly Robot Factory',
      location: {
        id: 'earth',
        name: 'Earth'
      }
    });
  });

  it('should allow nested schema fields', () => {
    let planetExpressShip = denormalize(schema.spacecraft, state, 1);

    // Collapse the ES5 getter:
    planetExpressShip.locationInfo = reify(planetExpressShip.locationInfo);

    assert.deepEqual(planetExpressShip, {
      id: 1,
      name: 'Planet Express Ship',
      locationInfo: {
        origin: {
          id: 'earth',
          name: 'Earth'
        }
      }
    });
  });

  it('should cache denormalization of the same entity', () => {
    let companies = denormalize(arrayOf(schema.company), state, [1,2]);
    assert.strictEqual(companies[0].location, companies[1].location);
  });

  it('should allow different calls to share a cache', () => {
    let cache = {};

    let fry = denormalize(schema.human, state, 1, cache),
        planetExpress = denormalize(schema.company, state, 1, cache);

    assert.strictEqual(fry, planetExpress.members[0]);
  });

  it('should have an option to turn off caching', () => {
    let companies = denormalize(arrayOf(schema.company), state, [1,2], false); // no cache
    assert.notStrictEqual(companies[0].location, companies[1].location);
  });

  it('should throw if fields are missing', () => {
    assert.throws(() => {
      denormalize(schema.human, state);
    }, 'Argument id is required');
    assert.throws(() => {
      denormalize(null, state, 1234);
    }, 'Argument schema is required');
    assert.throws(() => {
      denormalize(schema.human, null, 1234);
    }, 'Argument entities is required');
    assert.throws(() => {
      denormalize(schema.human, state, null);
    }, 'Argument selector is required');
  });
});

