import { arrayOf, Schema } from 'normalizr';

export const account = new Schema('accounts');
export const audience = new Schema('audiences');
export const file = new Schema('files');
export const fileReport = new Schema('fileReports');
export const list = new Schema('lists');
export const outsource = new Schema('outsources');
export const pointOfInterest = new Schema('pointsOfInterest');
export const product = new Schema('products');
export const state = new Schema('states');
export const user = new Schema('users');
export const vendor = new Schema('vendors');
export const vendorSetting = new Schema('vendorSettings');

account.define({users: arrayOf(user)});
audience.define({product, states: arrayOf(state) });
file.define({creator: user, report: fileReport });
list.define({outsources: arrayOf(outsource), audience });
outsource.define({vendor, list});
product.define({account});
vendor.define({settings: vendorSetting});
