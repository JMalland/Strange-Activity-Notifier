const sqlite3 = require('sqlite3').verbose();

class Database {
    #db;

    /**
     * 
     * @param {String} file The database file path
     * @param {Function} callback A function to call after creation.
     */
    constructor(file) {
        let object = this;
        this.#db = new sqlite3.Database(file, (error) => {
            if (error) {
                console.error(error);
            }
            
            console.log("Connected to database: " + file);
        });
    }

    static #setXEqualToY(columns, items, padding) {
        let compare_column_values = "'' = ''";
        padding = padding == undefined ? "" : padding;

        if (columns != undefined && items != undefined) {
            if (!(items instanceof Array)) {
                items = [items];
            }
    
            if (!(columns instanceof Array)) {
                columns = [columns];
            }

            items = items.map(item => "'" + JSON.stringify(item instanceof Object ? item : ("" + item)).slice(1,-1) + "'");
            for (let i=0; i<columns.length; i++) {
                compare_column_values += `${padding}${columns[i]} = ${items[i]}` // Statement to check every row for matching values
            }
            compare_column_values = compare_column_values.slice(7 + padding.length);
        }
        return(compare_column_values);
    }

    /**
     * 
     * @param {String} table The table name 
     * @param  {String | String[]} columns All columns that should exist under this table
     */
    async createIfAbsent(table, columns) {
        if (!(columns instanceof Array)) { // Columns isn't an array
            console.log("Not Array")
            columns = [columns];
        }
        return(new Promise((resolve, reject) => {
            this.table(table)
            .then((row) => {
                resolve(false); // The table previously existed
            })
            .catch((error) => {
                if (error) {
                    console.error(error);
                    reject(error);
                    return;
                }

                try {
                    this.#db.run(`CREATE TABLE "${table}" (${columns.join(', ')});`, (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                            return;
                        }
                    
                        console.log(`CREATE TABLE "${table}" (${columns.join(', ')});`);
                        resolve(true); // The table was created
                    })
                }
                catch(e) {
                    
                }
            });
        }));
    }

    /**
     * 
     * @param {String} sql The SQL to run 
     * @returns The SQL output 
     */
    async run(sql) {
        return(new Promise((resolve, reject) => {
            this.#db.run(sql, (error, row) => {
                if (error) {
                    console.error(error);
                    reject(error);
                }
                //console.error(error);
                //console.error(row);
                resolve(row);
            })
        }))
    }

    /**
     * 
     * @param {String} table The table name 
     * @param {String | String[]} info The columns to return (or SQL statement of what to return)
     * @param {String | String[]} columns Columns to search through
     * @param  {String | String[]} items Expected values of the columns
     * @returns The returned row of columns
     */
    async get(table, info, columns, items) {
        if (!(info instanceof Array)) {
            info = [info];
        }

        return(new Promise((resolve, reject) => {
            this.#db.all(`SELECT ${info.join(', ')} FROM "${table}" WHERE ${Database.#setXEqualToY(columns, items, ' AND ')};`, (error, rows) => {
                if (error) {
                    console.error(error);
                    reject(error);
                }

                console.log(`SELECT ${info.join(', ')} FROM "${table}" WHERE ${Database.#setXEqualToY(columns, items, ' AND ')};`);
                resolve(rows);
            });
        }));
    }

    /**
     * 
     * @param {String} table The table name 
     */
    async table(table) {
        return(new Promise((resolve, reject) => {
            this.#db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}';`, (error, row) => {
                if (error) {
                    console.log(error);
                    reject(error);
                }

                if (row == undefined) {
                    reject(row);
                }

                resolve(row);
            })
        }))
    }

    /**
     * 
     * @param {String} table The table to update
     * @param {String | String[]} keyTypes The column(s) to search in
     * @param {* | *[]} keyValues The value(s) to search for
     * @param {String | String[]} columns Column(s) to be updated
     * @param {* | *[]} items Value(s) to be updated 
     * @returns 
     */
    async update(table, keyTypes, keyValues, columns, items) {
        return(new Promise((resolve, reject) => {
            this.#db.run(`UPDATE "${table}" SET ${Database.#setXEqualToY(columns, items, ', ')} WHERE ${Database.#setXEqualToY(keyTypes, keyValues, ' AND ')};`, (error) => {
                if (error) {
                    console.error(error);
                    reject(error);
                }

                console.log(`UPDATE "${table}" SET ${Database.#setXEqualToY(columns, items, ', ')} WHERE ${Database.#setXEqualToY(keyTypes, keyValues, ' AND ')};`)
                resolve();
            });
        }));
    }

    /**
     * @param {String} table Table name
     * @param {String | String[]} columns Column name(s)
     * @param {* | *[]} items Value(s) to be added
     * @returns The inserted row
     */
    async insert(table, columns, items) {
        if (!(columns instanceof Array)) { // Columns isn't an array
            columns = [columns];
        }
        if (!(items instanceof Array)) { // Items isn't an array
            items = [items];
        }
        items = items.map(item => "'" + JSON.stringify(item instanceof Object ? item : ("" + item)).slice(1,-1) + "'");
        return(new Promise(async (resolve, reject) => {
            this.#db.run(`INSERT INTO "${table}" (${columns.join(', ')}) VALUES (${items.join(', ')});`, (error) => {
                if (error) {
                    console.error(error);
                    reject(error);
                }

                console.log(`INSERT INTO "${table}" (${columns.join(', ')}) VALUES (${items.join(', ')});`)
                resolve()
            });
        }));
    }

    /**
     * 
     * @param {String} table 
     * @param {String | String[]} keyTypes 
     * @param {* | *[]} keyValues 
     */
    async delete(table, keyTypes, keyValues) {
        return(new Promise((resolve, reject) => {
            this.#db.run(`DELETE FROM "${table}" WHERE ${Database.#setXEqualToY(keyTypes, keyValues, ' AND ')};`, (error) => {
                if (error) {
                    console.error(error);
                    reject(error);
                }

                console.log()
                resolve(`DELETE FROM "${table}" WHERE ${Database.#setXEqualToY(keyTypes, keyValues, ' AND ')};`);
            })
        }))
    }

    /**
     * @returns The sqlite Database object
     */
    get db() {
        return(this.#db);
    }
}

module.exports = {
    Database
}