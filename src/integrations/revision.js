/**
 * @file Integration for adding application revision number
 */

export default function (revision) {
  return function (event, data) {
    data.payload.revision = revision;
  };
};
