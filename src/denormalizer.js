import getIn from 'lodash/get';
import each from 'lodash/each';
import map from 'lodash/map';

export const resolved = Symbol('@resolved');

// Checks to see if you are failing to pass in any arguments.
function ensure(o) {
  if (process.env.NODE_ENV !== 'production') {
    Object.keys(o).forEach(k => {
      let v = o[k];
      if (v === null || v === undefined) {
        throw new Error(`Argument ${k} is required`);
      }
    });
  }
}

// Ducktype schemas by what they look like, not their constructor fn identity
function isSchema(s) {
  return s.getKey || s.getItemSchema;
}

// Retrieve a single item from the cache, provided a valid non-collection entity schema
function cacheGet(cache, schema, id) {
  return cache && cache[schema.getKey()] && cache[schema.getKey()][id];
}

// Insert a single item into the cache, provided a valid non-collection entity schema
// Then return that entity (for convenience sake)
function cacheSet(cache, schema, id, entity) {
  if(!cache) return entity;
  if(!cache[schema.getKey()]) cache[schema.getKey()] = {};
  cache[schema.getKey()][id] = entity;

  return entity;
}

// Denormalize a single entity. Any foreign schema entities will be proxied behind an ES5 getter,
// so the work of actually resolving them will only be done when necessary. This assumes the
// entity store is immutable, otherwise you might get some weird values out of foreign references.
// Using an ES5 getter can cause some weirdness when doing object comparisons, but the reduced
// overhead of using it definitely makes the cost worth it (e.g. for very large or complex nested
// schemas.  Entities will be cached unless the cache is specifically disabled.
//
// Denormalized entities that can't be found are resolved to an object with the entity's id
// property set. To determine if a foreign reference has been successfully resolved, use the
// isResolved function.
//
function denormalizeSingleEntity(schema, entities, id, cache) {
  ensure({ entities, schema, id, cache });

  // We've already resolved this entity:
  if(cacheGet(cache, schema, id)) {
    return cacheGet(cache, schema, id);
  } else if(getIn(entities, [schema.getKey(), id])) {
    let rawEntity = getIn(entities, [schema.getKey(), id], null),
        generatedEntity = Object.assign({}, rawEntity);

    each(schema, (nestedSchema, key) => {
      if(isSchema(nestedSchema) && rawEntity[key]) {
        delete generatedEntity[key];
        Object.defineProperty(generatedEntity, key, {
          // readonly: true, // true by default
          enumerable: true,
          get() {
            /*eslint no-use-before-define:0 */
            return denormalize(nestedSchema, entities, rawEntity[key], cache);
          }
        });
      }
    });

    return cacheSet(cache, schema, id, generatedEntity);
  } else {
    return {
      [schema.getIdAttribute()]: id,
      [resolved]: false // metadata value
    };
  }
}

function denormalizeEntityList(schema, entities, ids, cache) {
  ensure({ entities, schema, ids, cache });
  return ids.map(id => denormalize(schema.getItemSchema(), entities, id, cache));
}

function denormalizeUnionEntity(unionSchema, entities, selector, cache) {
  ensure({ entities, unionSchema, cache, selector });
  let { schema, id } = selector;
  ensure({ schema, id });
  let itemSchema = unionSchema.getItemSchema()[schema];
  return denormalize(itemSchema, entities, id, cache);
}

// Denormalize:
//
// For a given schema, entity store, and selector, denormalize the entities that match the
// provided schema and selector and return them.
//
export function denormalize(schema, entities, selector, cache = {}) {
  ensure({ entities, schema });

  if (schema.getKey) {
    return denormalizeSingleEntity(schema, entities, selector, cache);
  } else if (schema.getItemSchema && !schema.getSchemaKey) {
    return denormalizeEntityList(schema, entities, selector, cache);
  } else if (schema.getItemSchema && schema.getSchemaKey) {
    return denormalizeUnionEntity(schema, entities, selector, cache);
  } else {
    let e = new Error(`Unknown schema [${schema.valueOf()}]`);
    e.schema = schema;
    throw e;
  }
}

export function isResolved(value) {
  return value[resolved] === false ? false : true;
}
