import getIn from 'lodash/get';
import each from 'lodash/each';
import map from 'lodash/map';

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

function isSchema(s) {
  return s.getKey || s.getItemSchema;
}

function cacheGet(cache, schema, id) {
  return cache && cache[schema.getKey()] && cache[schema.getKey()][id];
}

function cacheSet(cache, schema, id, entity) {
  if(!cache) return entity;
  if(!cache[schema.getKey()]) cache[schema.getKey()] = {};
  cache[schema.getKey()][id] = entity;

  return entity;
}

function denormalizeSingleEntity(entities, schema, id, cache) {
  ensure({ entities, schema, id, cache });
  id = typeof id === 'number' ? id.toString() : id; // conflate numeric ids and string ids

  // We've already resolved this entity:
  if(cacheGet(cache, schema, id)) {
    return cacheGet(cache, schema, id);
  } else if(getIn(entities, [schema.getKey(), id])) {
    let rawEntity = getIn(entities, [schema.getKey(), id], null),
      generatedEntity = Object.assign({}, rawEntity);

    each(schema, (schema, key) => {
      if(isSchema(schema)) {
        delete generatedEntity[key];
        Object.defineProperty(generatedEntity, key, {
          enumerable: true,
          get() {
            /*eslint no-use-before-define:0 */
            return denormalize(entities, schema, rawEntity[key], cache) ||
              { [schema.getIdAttribute()]: rawEntity[key] };
          }
        });
      }
    });

    return cacheSet(cache, schema, id, generatedEntity);
  } else {
    return null;
  }
}

function denormalizeEntityList(entities, schema, ids, cache) {
  ensure({ entities, schema, cache });
  let itemSchema = schema.getItemSchema();

  if(ids) {
    return ids.map(id => denormalizeSingleEntity(entities, itemSchema, id, cache));
  } else if(entities[itemSchema.getKey()]) {
    return map(getIn(entities, [itemSchema.getKey()]), (val, id) => {
      return denormalizeSingleEntity(entities, itemSchema, id, cache);
    });
  }
}

export default function denormalize(entities, schema, selector, cache = {}) {
  ensure({ entities, schema });

  if (schema.getKey) {
    return denormalizeSingleEntity(entities, schema, selector, cache);
  } else if (schema.getItemSchema) {
    return denormalizeEntityList(entities, schema, selector, cache);
  } else {
    let e = new Error(`Unknown schema [${schema.valueOf()}]`);
    e.schema = schema;
    throw e;
  }
}
