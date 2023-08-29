const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

function jsonToArray(input) {
  input = JSON.parse(input);
  let arr = [];
  for (let i in input) arr.push(input[i]);
  return arr;
}

module.exports = { getRows, getCronData, addRow, deleteRows, editRow };

// add row to cronjob
function addRow(data) {
  pool.query(
    `INSERT INTO cronjob (name, schedule, target_type, target_id, check_presence, channel_id, header, note, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      data.name,
      data.schedule,
      data.target_type,
      data.target_id,
      data.check_presence,
      data.channel_id,
      data.header,
      data.note,
      data.is_active,
    ],
    (err) => {
      if (err) throw err;
    }
  );
}

// edit row from cronjob
function editRow(data) {
  try {
    pool.query(
      `UPDATE cronjob SET name= $1, schedule= $2, target_type= $3, target_id= $4, check_presence= $5, channel_id= $6, header= $7, note= $8, is_active= $9 WHERE id = $10`,
      [
        data.name,
        data.schedule,
        data.target_type,
        data.target_id,
        data.check_presence,
        data.channel_id,
        data.header,
        data.note,
        data.is_active,
        data.id,
      ]
    );
  } catch (err) {
    console.error(err);
  }
}

// delete rows from cronjob
function deleteRows(names) {
  for (const name of names) {
    pool.query("DELETE FROM cronjob WHERE name = $1", [name], (err) => {
      if (err) throw err;
    });
  }
}

// get all rows from cronjob
async function getRows() {
  try {
    let res = await pool.query(`SELECT * FROM cronjob`);
    return res.rows;
  } catch (err) {
    console.log(err.stack);
  }
}

// get specific row
async function getCronData(cronName) {
  try {
    let res = await pool.query(
      `SELECT id, name, schedule, target_type, target_id, check_presence, channel_id, header, note, is_active FROM cronjob WHERE name = $1 `,
      [cronName]
    );
    return res.rows[0];
  } catch (err) {
    console.log(err.stack);
  }
}
