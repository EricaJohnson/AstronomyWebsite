"use strict";
/*jslint vars: true, plusplus: true, devel: true, nomen: true*/
/*global define */

var express = require("express");
var http    = require("http");
var mysql   = require("mysql");

var app     = express();
var server  = http.createServer(app);

var con = mysql.createConnection({
    host:     "ix.cs.uoregon.edu",
    user:     "sberg",
    password: "7dell7",
    database: "astronomy",
    port:     3821
});
var port = 5791;

// tables that have a "name" attribute
var TABLES = [
    "asteroid",
    "comet",
    "constellation",
    "galaxy",
    "galaxy_group",
    "moon",
    "nebula",
    "planet",
    "researcher",
    "star",
    "star_cluster",
    "supernova",
    "telescope",
];

con.connect();
server.listen(port);

app.get("/table", spill_data);
app.get("/timeline", make_timeline);
app.get("/random_object", get_random_object);
app.get("/largest_star", get_largest_star);
app.get("/smallest_star", get_smallest_star);
app.get("/farthest_from_earth", get_farthest_from_earth);
app.get("/brightest_star_cluster", get_brightest_star_cluster);
app.get("/most_faint_star_cluster", get_most_faint_star_cluster);
app.get("/oldest_star_cluster", get_oldest_star_cluster);
app.get("/newest_star_cluster", get_newest_star_cluster);
app.get("/planet_max_period", get_planet_max_period);
app.get("/planet_min_period", get_planet_min_period);
app.get("/images", make_images);
app.get("/images", make_images);
app.get("/planets_to_stars", get_planets_to_stars);
app.get("/researchers", objects_by_discoverer);
app.get("/insert_planet", insert_planet);
app.get("/search_by_constellation", search_by_constellation);
app.get("/search_by_name", search_by_name);
app.get("/search_entire_database", search_entire_database);
app.use(express.static(__dirname));

console.log("working");

// helper functions
function build_rows_array(rows) {
    var rows_array = [];
    for (var row in rows) {
        rows_array.push(rows[row]);
    }
    return rows_array;
}

function build_table(rows, keys) {
    var table = "";
    // add the header
    table += "<tr>";
    for (var i = 0; i < keys.length; i++) {
        table += "<td>";
        table += keys[i];
        table += "</td>";
    }
    table += "</tr>";
    // add the rows
    for (i = 0; i < rows.length; i++) {
        table += "<tr>";
        for (var j = 0; j < keys.length; j++) {
            table += "<td>";
            table += rows[i][keys[j]];
            table += "</td>";
        }
        table += "</tr>";
    }
    return table;
}

function define_field(table_name) {
    if (table_name === "asteroid") {
        return "designation";
    } else {
        return "name";
    }
}

function insert_table_break(html) {
    if (html !== "") {
        html += "<td class=\"table_break\">break</td>";
    }
    return html;
}

function random_int(n) {
    return Math.floor(Math.random() * n);
}

function report_query_error(res) {
    console.log("query error");
    res.json("<td>query error</td>");
}

function trim(string) {
    var trimmed_string = "";
    for (var i = 1; i < string.length - 1; i++) {
        trimmed_string += string[i];
    }
    return trimmed_string;
}

// main functions
function spill_data(req, res) {
    if (req.query.table === null) {
        console.log("server got query with no table specified");
        return;
    }

    // using prepared statement to avoid SQL injection
    var query = "SELECT * from (" + trim(con.escape(req.query.table)) + ");";
	var rows = con.query(query, function (err, rows) {
        if (!err) {
            var rows_array = build_rows_array(rows);
            var keys = Object.keys(rows[0]);
            res.json(build_table(rows_array, keys));
        } else {
            report_query_error(res);
        }
    });
}

function make_timeline(req, res) {
    var query = "SELECT year_discovered, designation AS name " +
                "FROM asteroid WHERE year_discovered IS NOT NULL " +
                "union all " +
                "SELECT year_discovered, name " +
                "FROM comet WHERE year_discovered IS NOT NULL " +
                "union all " +
                "SELECT year_discovered, name " +
                "FROM galaxy WHERE year_discovered IS NOT NULL " +
                "union all " +
                "SELECT year_discovered, name " +
                "FROM moon WHERE year_discovered IS NOT NULL " +
                "union all " +
                "SELECT year_discovered, name " +
                "FROM nebula WHERE year_discovered IS NOT NULL " +
                "union all " +
                "SELECT year_discovered, name " +
                "FROM planet WHERE year_discovered IS NOT NULL " +
                "union all " +
                "SELECT year_discovered, name " +
                "FROM star WHERE year_discovered IS NOT NULL " +
                "ORDER BY year_discovered;";
    var rows = con.query(query, function (err, rows) {
        if (!err) {
            var rows_array = build_rows_array(rows);
            var keys = Object.keys(rows[0]);
            res.json(build_table(rows_array, keys));
        } else {
            report_query_error(res);
        }
    });
}

function get_random_object(req, res) {
    var table = TABLES[random_int(TABLES.length)];
    var query = "SELECT COUNT(*) AS count FROM " + table + ";";

    var rows = con.query(query, function (err, rows) {
        if (!err) {
            var id = random_int(rows[0].count) + 1; // + 1 since ids start at 1
            var query = "SELECT * FROM " + table + " WHERE " + table +
                        "_id = " + id;
            var random_object = con.query(query, function (err, random_object) {
                if (!err) {
                    var keys = Object.keys(random_object[0]);
                    var rows_array = build_rows_array(random_object);
                    res.json(build_table(rows_array, keys));
                } else {
                    report_query_error(res);
                }
            });

        } else {
            report_query_error(res);
        }
    });
}

function get_planets_to_stars(req, res) {
    var query = "SELECT p.name AS planet, s.name AS star " +
        "FROM star s JOIN star_orbitted so USING(star_id) " +
        "JOIN planet p USING(planet_id);";

    var rows = con.query(query, function (err, rows) {
        if (!err) {
            var keys = Object.keys(rows[0]);
            var rows_array = build_rows_array(rows);
            res.json(build_table(rows_array, keys));
        } else {
            report_query_error(res);
        }
    });
}

function make_images(req, res) {
    var query = "SELECT name, path " +
                "FROM picture AS pictures JOIN " +
                    "(SELECT designation AS name, picture_id " +
                	"FROM asteroid WHERE picture_id IS NOT NULL " +
                		"union all " +
                	"SELECT name, picture_id " +
                	"FROM comet WHERE picture_id IS NOT NULL " +
                		"union all " +
                	"SELECT name, picture_id " +
                	"FROM constellation WHERE picture_id IS NOT NULL " +
                		"union all " +
                	"SELECT name, picture_id " +
                	"FROM galaxy WHERE picture_id IS NOT NULL " +
                		"union all " +
                	"SELECT name, picture_id " +
                	"FROM galaxy_group WHERE picture_id IS NOT NULL " +
                		"union all " +
                	"SELECT name, picture_id " +
                	"FROM moon WHERE picture_id IS NOT NULL " +
                		"union all " +
                	"SELECT name, picture_id " +
                	"FROM nebula WHERE picture_id IS NOT NULL " +
                		"union all " +
                	"SELECT name, picture_id " +
                	"FROM planet WHERE picture_id IS NOT NULL " +
                		"union all " +
                	"SELECT name, picture_id " +
                	"FROM researcher WHERE picture_id IS NOT NULL " +
                		"union all " +
                	"SELECT name, picture_id " +
                	"FROM star WHERE picture_id IS NOT NULL " +
                		"union all " +
                	"SELECT name, picture_id " +
                	"FROM star_cluster WHERE picture_id IS NOT NULL " +
                		"union all " +
                	"SELECT name, picture_id " +
                	"FROM telescope WHERE picture_id IS NOT NULL) " +
                "AS objects USING(picture_id) " +
                "ORDER BY name;";
    var images_body = "";
    var rows = con.query(query, function (err, rows) {
        if (!err) {
            for (var i = 0; i < rows.length; i++) {
                rows[i].image = "<div width=500px style=" +
                    "\"background:rgba(0,0,0,0.5)\"><img id=\"image\" src=\"" +
                    rows[i].path + "\" ></div>";
                delete rows[i].path;
                rows[i].name = "<div style=\"max-width:150px\">" + rows[i].name +
                    "</div>";
            }
            var keys = Object.keys(rows[0]);
            images_body += build_table(rows, keys);
            res.json(images_body);
        } else {
            console.log("query error");
        }
    });
}

function objects_by_discoverer(req, res) {
    var query = "SELECT r.researcher_id, r.name AS researcher_name, nationality, o.name AS object_discovered " +
                "FROM researcher AS r JOIN " +
                    "(SELECT designation AS name, researcher_id " +
                	"FROM asteroid WHERE researcher_id IS NOT NULL " +
                		"union all " +
                	"SELECT name, researcher_id " +
                	"FROM comet WHERE researcher_id IS NOT NULL " +
                		"union all " +
                	"SELECT name, researcher_id " +
                	"FROM galaxy WHERE researcher_id IS NOT NULL " +
                		"union all " +
                	"SELECT name, researcher_id " +
                	"FROM moon WHERE researcher_id IS NOT NULL " +
                		"union all " +
                	"SELECT name, researcher_id " +
                	"FROM nebula WHERE researcher_id IS NOT NULL " +
                		"union all " +
                	"SELECT name, researcher_id " +
                	"FROM planet WHERE researcher_id IS NOT NULL " +
                		"union all " +
                	"SELECT name, researcher_id " +
                	"FROM star WHERE researcher_id IS NOT NULL) " +
                "AS o ON  r.researcher_id = o.researcher_id " +
                "ORDER BY r.name;";
    var rows = con.query(query, function (err, rows) {
        if (!err) {
            var keys = Object.keys(rows[0]);
            res.json(build_table(rows, keys));
        } else {
            report_query_error(res);
        }
    });
}

function insert_planet(req, res) {
    var star_query = 
        "SELECT EXISTS(SELECT name FROM star WHERE name LIKE " +
        con.escape(req.query.star) + ");";
    var star_rows = con.query(star_query, function (err, star_rows) {
        if (!err) {
            var star_keys = Object.keys(star_rows[0]);
            if (star_rows[0][star_keys[0]] === 1) {
                var researcher_query =
                    "SELECT EXISTS(SELECT name FROM researcher WHERE name " +
                    "LIKE " + con.escape(req.query.researcher) + ");";
                // TO CHECK IF RESEARCHER IS IN DB:
                var r_rows = 
                    con.query(researcher_query, function (err, r_rows) {
                    if (!err) {
                        var r_keys = Object.keys(r_rows[0]);
                        if (r_rows[0][r_keys[0]] === 1) {
                             // INSERT INTO DATABASE
                            insert_max_planet_id(req, res);
                        }
                    } else {
                        report_query_error(res);
                    }
                });
            }
        } else {
            report_query_error(res);
        }
    });
}

function insert_max_planet_id(req, res) {
    var max_id_query = "SELECT MAX(planet_id) AS id FROM planet;";
    con.query(max_id_query, function (err, rows) {
        if (!err) {
            var planet_id = rows[0].id + 1; 
            insert_researcher_id(req, res, planet_id);
        } else {
            report_query_error(res);
        }
    });
}

function insert_researcher_id(req, res, planet_id) {
    var res_id_query =
        "SELECT researcher_id AS id FROM researcher WHERE name LIKE " +
        con.escape(req.query.researcher) + ";";
    con.query(res_id_query, function (err, rows) {
        if (!err) {
            var researcher_id = rows[0].id;
            var planet_query = 
                "INSERT INTO planet " +
                "(`planet_id`, `name`, `orbital_period_d`, `researcher_id`, " +
                "`year_discovered`, `mass_earth_units`, `picture_id`) " +
                "VALUES " + "('" +
                planet_id + "', '" + 
                trim(con.escape(req.query.name)) + "', '" +
                parseFloat(trim(con.escape(req.query.orbital_period))).toFixed(3) + "', '" +
                researcher_id + "', '" +
                trim(con.escape(req.query.year_discovered)) + "', '" +
                parseFloat(trim(con.escape(req.query.mass_earth_units))).toFixed(2) +
                "', 'null');";
            console.log(planet_query);
            finally_insert_planet(res, planet_query);
        } else {
            report_query_error(res);
        }
    });
}

function finally_insert_planet(res, planet_query) {
    con.query(planet_query, function (err, rows) {
        if (!err) {
            console.log("planet inserted");
        } else {
            console.log(err);
            console.log("planet not inserted");
        }
    });
    
}

function search_by_constellation(req, res) {
    // using prepared statements to avoid SQL injection
    var constellation_query =
        "SELECT c.name AS constellation, g.name As objects_in_constellation " +
        "FROM constellation c JOIN galaxy g USING(constellation_id) " +
        "WHERE c.name REGEXP \"^.*" + trim(con.escape(req.query.input)) +
        ".*$\" UNION ALL " +
        "SELECT c.name AS constellation, n.name As objects_in_constellation " +
        "FROM constellation c JOIN nebula n USING(constellation_id) " +
        "WHERE c.name REGEXP \"^.*" + trim(con.escape(req.query.input)) +
        ".*$\" UNION ALL " +
        "SELECT c.name AS constellation, s.name As objects_in_constellation " +
        "FROM constellation c JOIN star s USING(constellation_id) " +
        "WHERE c.name REGEXP \"^.*" + trim(con.escape(req.query.input)) +
        ".*$\" UNION ALL " +
        "SELECT c.name AS constellation, sc.name As objects_in_constellation " +
        "FROM constellation c JOIN star_cluster sc USING(constellation_id) " +
        "WHERE c.name REGEXP \"^.*" + trim(con.escape(req.query.input)) +
        ".*$\" UNION ALL " +
        "SELECT c.name AS constellation, sn.name As objects_in_constellation " +
        "FROM constellation c JOIN supernova sn USING(constellation_id) " +
        "WHERE c.name REGEXP \"^.*" + trim(con.escape(req.query.input)) +
        ".*$\" ORDER BY constellation;";

    var con_table;
    var con_rows = con.query(constellation_query, function (err, rows) {
        if (!err) {
            var con_rows_array = build_rows_array(rows);
            if (rows.length > 0) {
                var keys = Object.keys(rows[0]);
                var con_table = build_table(con_rows_array, keys);
                res.json(con_table);
            } else {
                res.json("<td>search produced no results</td>");
            }
        } else {
            report_query_error(res);
        }
    });
}

function search_by_name(req, res) {
    search_by_name_recursive(res, 0, req.query.input, "");
}

function search_by_name_recursive(res, index, name, html) {
    var field = define_field(TABLES[index]);
    var query =
        "SELECT * FROM " + TABLES[index] + " WHERE " + field + " REGEXP " +
        "\"^.*" + trim(con.escape(name)) + ".*$\";";
    var rows = con.query(query, function (err, rows) {
        if (!err) {
            // if the query produced a result add the result to the html output
            if (rows.length > 0) {
                var rows_array = build_rows_array(rows);
                var keys = Object.keys(rows[0]);
                var table = build_table(rows_array, keys);
                html = insert_table_break(html);
                html += table;
            }
            if (index < TABLES.length - 1) {
                search_by_name_recursive(res, index + 1, name, html);
            } else if (html.length > 0) {
                res.json(html);
            } else {
                res.json("<td>search produced no results</td>");
            }
        } else {
            console.log(err);
            report_query_error(res);
        }
    });
}

function search_entire_database(req, res) {
    search_entire_database_recursive(res, 0, req.query.input, "");
}

function search_entire_database_recursive(res, index, term, html) {
    var field = define_field(TABLES[index]);
    var query = "SELECT * FROM " + TABLES[index];
    var rows = con.query(query, function (err, rows) {
        if (!err) {
            if (rows.length > 0) {
                var rows_array = build_rows_array(rows);
                var keys = Object.keys(rows[0]);
                var match_list = [];
                for (var i = 0; i < rows_array.length; i++) {
                    for (var j = 0; j < keys.length; j++) {
                        // intentionally using == for type coercion
                        if (rows_array[i][keys[j]] == term) {
                            match_list.push(rows_array[i]);
                            break; // prevents duplicate entries
                                   //   with the search term
                                   //   in multiple columns
                        }
                    }
                }
                if (match_list.length > 0) {
                    html = insert_table_break(html);
                    var table = build_table(match_list, keys);
                    html += table;
                }
            }
            if (index < TABLES.length - 1) {
                search_entire_database_recursive(res, index + 1, term, html);
            } else if (html.length > 0) {
                res.json(html);
            } else {
                res.json("<td>search produced no results</td>");
            }
        } else {
            console.log(err);
            report_query_error(res);
        }
    });
}

function get_largest_star(req, res) {
    var query = "SELECT * FROM star WHERE solar_mass IN " +
        "(SELECT MAX(solar_mass) AS solar_mass FROM star);";
    var rows = con.query(query, function (err, rows) {
        if (!err) {
            var html = "<td class=\"extreme_header\">Largest Star</td>";
            var keys = Object.keys(rows[0]);
            var rows_array = build_rows_array(rows);
            html += build_table(rows_array, keys);
            res.json(html);
        } else {
            report_query_error(res);
        }
    });
}

function get_smallest_star(req, res) {
    var query = "SELECT * FROM star WHERE solar_mass IN " +
        "(SELECT MIN(solar_mass) AS solar_mass FROM star);";
    var rows = con.query(query, function (err, rows) {
        if (!err) {
            var html = "<td class=\"extreme_header\">Smallest Star</td>";
            var keys = Object.keys(rows[0]);
            var rows_array = build_rows_array(rows);
            html += build_table(rows_array, keys);
            res.json(html);
        } else {
            report_query_error(res);
        }
    });
}

function get_brightest_star_cluster(req, res) {
    var query = "SELECT * FROM star_cluster WHERE brightness IN " +
        "(SELECT MAX(brightness) AS brightness FROM star_cluster);";
    var rows = con.query(query, function (err, rows) {
        if (!err) {
            var html = "<td class=\"extreme_header\">Brightest Star Cluster</td>";
            var keys = Object.keys(rows[0]);
            var rows_array = build_rows_array(rows);
            html += build_table(rows_array, keys);
            res.json(html);
        } else {
            report_query_error(res);
        }
    });
}

function get_most_faint_star_cluster(req, res) {
    var query = "SELECT * FROM star_cluster WHERE brightness IN " +
        "(SELECT MIN(brightness) AS brightness FROM star_cluster);";
    var rows = con.query(query, function (err, rows) {
        if (!err) {
            var html =
                "<td class=\"extreme_header\">Dimmest Star Cluster</td>";
            var keys = Object.keys(rows[0]);
            var rows_array = build_rows_array(rows);
            html += build_table(rows_array, keys);
            res.json(html);
        } else {
            report_query_error(res);
        }
    });
}

function get_oldest_star_cluster(req, res) {
    var query = "SELECT * FROM star_cluster WHERE age_my IN " +
        "(SELECT MAX(age_my) AS age_my FROM star_cluster);";
    var rows = con.query(query, function (err, rows) {
        if (!err) {
            var html = "<td class=\"extreme_header\">Oldest Star Cluster</td>";
            var keys = Object.keys(rows[0]);
            var rows_array = build_rows_array(rows);
            html += build_table(rows_array, keys);
            res.json(html);
        } else {
            report_query_error(res);
        }
    });
}

function get_newest_star_cluster(req, res) {
    var query = "SELECT * FROM star_cluster WHERE age_my IN " +
        "(SELECT MIN(age_my) AS age_my FROM star_cluster);";
    var rows = con.query(query, function (err, rows) {
        if (!err) {
            var html =
                "<td class=\"extreme_header\">Youngest Star Cluster</td>";
            var keys = Object.keys(rows[0]);
            var rows_array = build_rows_array(rows);
            html += build_table(rows_array, keys);
            res.json(html);
        } else {
            report_query_error(res);
        }
    });
}

function get_planet_max_period(req, res) {
    var query = "SELECT * FROM planet WHERE orbital_period_d IN " +
        "(SELECT MAX(orbital_period_d) AS orbital_period_d FROM planet);";
    var rows = con.query(query, function (err, rows) {
        if (!err) {
            var html =
                "<td class=\"extreme_header\">Longest Orbital Period</td>";
            var keys = Object.keys(rows[0]);
            var rows_array = build_rows_array(rows);
            html += build_table(rows_array, keys);
            res.json(html);
        } else {
            report_query_error(res);
        }
    });
}

function get_planet_min_period(req, res) {
    var query = "SELECT * FROM planet WHERE orbital_period_d IN " +
        "(SELECT MIN(orbital_period_d) AS orbital_period_d FROM planet);";
    var rows = con.query(query, function (err, rows) {
        if (!err) {
            var html =
                "<td class=\"extreme_header\">Shortest Orbital Period</td>";
            var keys = Object.keys(rows[0]);
            var rows_array = build_rows_array(rows);
            html += build_table(rows_array, keys);
            res.json(html);
        } else {
            report_query_error(res);
        }
    });
}

function get_farthest_from_earth(req, res) {
    var query = 
        "SELECT name, distance_ly FROM star UNION ALL " +
        "SELECT name, distance_ly FROM galaxy_group UNION ALL " +
        "SELECT name, distance_ly FROM supernova " +
        "WHERE distance_ly IN " +
        "(SELECT MAX(distance_ly) AS distance_ly FROM " +
        " (SELECT name, distance_ly FROM star " +
        "  UNION ALL " +
        "  SELECT name, distance_ly FROM galaxy_group " +
        "  UNION ALL " +
        "  SELECT name, distance_ly FROM supernova) as distances) " +
        "ORDER BY distance_ly DESC LIMIT 1;";
    var rows = con.query(query, function (err, rows) {
        if (!err) {
            var html =
                "<td class=\"extreme_header\">Farthest from Earth</td>";
            var keys = Object.keys(rows[0]);
            var rows_array = build_rows_array(rows);
            html += build_table(rows_array, keys);
            res.json(html);
        } else {
            report_query_error(res);
        }
    });
}
