var mysql = require('mysql');
var inquirer = require('inquirer');
const cTable = require('console.table');
var basket = [];

//Takes in returned mySQL data and formats it neatly for an inquirer list
function formatArrayOfObjects( arr ){

    let t = [], largest, formatted = [];

    //get column names to beginning of array
    t.push( Object.keys( arr[0] ));
    
    //convert objects values to array
    for( let i = 0; i < arr.length; i++ ){
        t.push( Object.values( arr[i] ));
    }

    for( let i = 0; i < t[0].length; i++ ){

        largest = 0;

        //find largest string in table
        for( let ii = 0; ii < t.length; ii++ ){

            if( typeof(t[ii][i]) != "string" )
                t[ii][i] = String( t[ii][i] );

            if( t[ii][i].length > largest)
                largest = t[ii][i].length;
        }
        
        for( let ii = 0; ii < t.length; ii++ ){

            let padding = largest - t[ii][i].length;
            while( padding-- )
                t[ii][i] += " ";    
        }
    }

    for( let i = 0; i < t.length; i++ ){
        formatted.push( "" );

        for( let ii = 0; ii < t[i].length; ii++ )
            formatted[i] += t[i][ii] + "  ";
    }

    return {

        header: formatted.slice( 0, 1 ),
        list: formatted.slice( 1 )

    }
}

function insertItem( item ){
    var sql = "INSERT INTO products (product_name, department, price, stock) \
        VALUES ('" + item.name + "', '" + item.dept + "', " + item.price + ", " + item.amount + ")";
    con.query(sql, function (err, result) {
        if (err)
            console.log( "ERROR:" + err );
        else{
            con.query("SELECT * FROM products", (err, result) => {
                if (err) throw err;
                console.log(result);
            });
        }                    
  });
}

function supervisor() {
    inquirer.prompt([
        {
            type: 'list',
            name: 'superMenu',
            message: 'Welcome, master, how may I serve you?',
            choices: [
                "View Product Sales by Department",
                "Create New Department",
                "Quit"
            ]
        }
    ]).then( answer => {

        switch( answer.superMenu ){
            case "View Product Sales by Department":
                con.query(
                    "SELECT departments.dept_id, \
                    products.department, \
                    SUM(products.product_sales) AS sales, \
                    departments.over_head_costs, \
                    SUM(products.product_sales) - departments.over_head_costs AS total_profits \
                    FROM products \
                    LEFT JOIN departments ON products.department = departments.dept_name \
                    GROUP BY department;" , (err, result) => {
                    
                        if( err ) throw err;
                        console.log("");
                        console.table( result );
                        supervisor();
                });
                break;
            case "Create New Department":
                inquirer.prompt([
                    {
                        type: 'input',
                        name: 'deptName',
                        message: 'What is the name of the department you would like to add?'
                    },{
                        type: 'input',
                        name: 'overHead',
                        message: 'Is there an initial overhead cost you would like to add?',
                        default: 0
                    }
                ]).then( a => {
                    var sql = "INSERT INTO departments (dept_name, over_head_costs) \
                        VALUES ('" + a.deptName + "', '" + a.overHead + "')";
                    con.query(sql, function (err) {
                        if (err)
                            console.log( "ERROR:" + err );
                        
                        supervisor();
                    });
                })
                break;
            default:
                console.log( "Goodbye, master. Would you marry a computer? jw, my friend wants to know.");
                con.end();
                break;
        }
    });
}

function manager(){

    inquirer.prompt([
        {
            type: "list",
            name: 'mp',                                      
            message: "Welcome, manager. How can I assist you today?",
            choices: [
                "View Products For Sale",
                "View Low Inventory",
                "Add To Inventory",
                "Add New Product",
                "Quit"
            ]
        }
    ]).then( answer => {

        switch( answer.mp ){
            case "Quit":
                console.log( "Goodbye Manager, please turn off the lights and deposit store tills at bank :)");
                con.end();
                break;
            case "View Products For Sale":
                con.query("SELECT * FROM products", (err, result) => {
                    if( err ) throw err;
                    console.log("");
                    console.table( result );
                    manager();
                });
                break;
            case "View Low Inventory":
                con.query("SELECT * FROM products WHERE stock < 5", (err, result) => {
                    if( err ) throw err;
                    console.log("");
                    console.log("******************");
                    console.log("* Low Stock View *");
                    console.log("******************");
                    console.table( result );
                    manager();
                    
                });
                break;
            case "Add To Inventory":
                con.query("SELECT * FROM products", (err, result) => {
                    if( err ) throw err;
                    let sqlQ = formatArrayOfObjects( result );

                    inquirer.prompt([
                        {
                            type: 'list',
                            name: 'inv',
                            message: sqlQ.header,
                            choices: sqlQ.list,
                            filter: v => {

                                return parseFloat( v.charAt(0) );
                            }
                        }
                    ]).then( answer => {

                        inquirer.prompt([
                            {
                                type: 'input',
                                name: 'stock',
                                message: 'How many do you want to add to inventory?',
                                
                            }
                        ]).then( amt => {
                            con.query("UPDATE products SET stock = stock + " + amt.stock + 
                                " WHERE item_id = " + answer.inv, err => {
                                if( err ) throw error; else console.log( "Stock updated!" )
                                manager();
                            });
                        });   
                    });
                })
                
                break;
            case "Add New Product":
                inquirer.prompt([
                    {
                        type: 'input',
                        name: 'name',
                        message: 'Please enter title of game'
                    },
                    {
                        type: 'input',
                        name: 'dept',
                        message: 'Please enter the platform the game id for'
                    },
                    {
                        type: 'input',
                        name: 'price',
                        message: 'What is the price?'
                    },
                    {
                        type: 'input',
                        name: 'amount',
                        message: 'How many?',
                        default: '1'
                    }
                ]).then( a => {
                    insertItem( a );
                    manager();
                });
                break;
        }

    });
}

function shop(){
    con.query("SELECT * FROM products", (err, result, fields) => {
        if (err) throw err;
        
        var itemList = [];

        //adjust game selection based on what's in buyers basket
        for( let i = 0; i < result.length; i++ ){

            
                        
            if( result[i].stock )
                itemList.push( result[i].product_name + "   $" + result[i].price + "   In Stock: " + result[i].stock );        
        }

        //add option to stop shopping
        itemList.push( "Leave" );

        inquirer.prompt([
            {
                type: 'list',
                name: 'shop',
                message: 'Check these retro games out, bro!?\n',
                choices: itemList,
                filter: v => {

                    if( v != "Leave" ){
                        let t = v.replace(/ /g, ""), found = false;
                        t = t.split("$");
                        
                        //search if buyer already has item in basket. If so, add it to amount of item in basket
                        for( let i = 0; i < basket.length; i++ ){

                            if( basket[i].item === t[0] ){
                                console.log("here's another one!");
                                basket[i].amount++;
                                found = true;
                            }
                        }

                        

                        if( !found ){
                            basket.push({
                                item: t[0],
                                price: parseFloat( t[1] ),
                                amount: 1
                            });
                        }
                    }
                }
            },{

                type: 'confirm',
                name: 'buyMore',
                message: 'Would you like anything else?',
                default: true
            }
        ]).then( answers => {

            if( answers.buyMore ){

                //last mysql database adjust
                for( let i = 0; i < result.length; i++ )
                for( let ii = 0; ii < basket.length; ii++)
                    if( basket[ii].item === result[i].product_name ){
                        result[i].stock -= basket[ii].amount;
                        result[i].product_sales += basket[ii].amount * basket[ii].price;
                        
                    }
                shop();

                
            }else{

                if( basket.length ){

                    let total = 0;
                    for( let i = 0; i < basket.length; i++ )
                        total += basket[i].price * basket[i].amount;

                    console.log( " Your total is: " + total );

                    //last mysql database adjust
                    for( let i = 0; i < result.length; i++ )
                        for( let ii = 0; ii < basket.length; ii++)
                            if( basket[ii].item === result[i].product_name ){
                                result[i].stock -= basket[ii].amount;
                                result[i].product_sales += basket[ii].amount * basket[ii].price;
                                
                            }
                    
                    for( let i = 0; i < result.length; i++ ){
                        con.query( "UPDATE products SET stock = '" + result[i].stock  + 
                            "', product_sales = '" + result[i].product_sales + "' \
                             WHERE product_name = '" + result[i].product_name +"'", err  => {
                            if( err) throw err;
                        });
                    }
                }
                    
                console.log( " Thanks for stopping by, bro!" );
                con.end();
            }
        });
    });
}

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "alu1ndra1",
    database: "bamazon"
});

con.connect(function(err) {
    if (err) throw err;

    switch( process.argv[2] ){

        case "manager":

            manager();
            
            break;
        case "shop":

            shop();
            
            break;
        case "super":
            supervisor();
            break;
        case "-help":
            //help menu
            console.log( "Coming Soon...");
            
            break;
        default:
            console.log( 'Invalid command, type "node bamazon.js -help" for help' );
            con.end();
            break;
    }


});