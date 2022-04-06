'use strict'

let knex
let JWT_REFRESH_STORE_NAME
let AUTH_USER_STORE_NAME

exports.setTokenService = (service) => knex = service 
exports.setUserService = (service) => knex = service 
exports.setRefreshTokenStoreName = (name) => JWT_REFRESH_STORE_NAME = name
exports.setAuthUserStoreName = (name) => AUTH_USER_STORE_NAME = name

// id field must be unique, upsert for PostgreSQL, MySQL, and SQLite only
exports.setRefreshToken = async (id, refresh_token) => knex(JWT_REFRESH_STORE_NAME).insert({ id, refresh_token }).onConflict('id').merge()
exports.getRefreshToken = async (id) => ( await knex(JWT_REFRESH_STORE_NAME).where({ id: id }).first() ).refresh_token
exports.revokeRefreshToken = async(id) => knex(JWT_REFRESH_STORE_NAME).where({ id: id }).delete()
exports.updateUser = async (where, payload) => knex(AUTH_USER_STORE_NAME).where(where).first().update(payload)

//Changed for <Project Totoz> usecase
exports.findUser = async (where) => {
  try {
    return knex('identities').where(where).first()
    //.join('members as t2', 't1.id', 't2.id').join('id_documents as t3', 't1.id', 't3.member_id').where(where).first()
  }catch(e) {
    console.log(e.toString())
  }
}

exports.find2FA = async (where) => {
  try {
    return knex('two_factors').where(where).first()
  }catch(e) {
    console.log(e.toString())
  }
}



