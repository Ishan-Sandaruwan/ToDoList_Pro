//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
//connect to database
mongoose
  .connect("mongodb://127.0.0.1:27017/ToDoList", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

 // about main todo collection 
const toDoShema = {
  name: String,
};
const Todo = mongoose.model("Todo", toDoShema);

// about custom lists collections
const customListShema = {
  listName : String ,
  listItems : [toDoShema]
}
const CustomList = mongoose.model("CustomList",customListShema);

// default items
const todo1 = new Todo({
  name: "Welcome to your todolist!",
});
const todo2 = new Todo({
  name: "Hit the + button to add new item.",
});
const todo3 = new Todo({
  name: "<-- Hit this to delete an item ",
});
const defaultItems = [todo1, todo2, todo3];

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));





app.get("/", async function (req, res) {
  try {
    const todos = await Todo.find({});
    if(todos.length === 0){
      Todo.insertMany(defaultItems).then(()=>{
        console.log("Default items inserted successfully ! ");
      }).catch((err)=>{
        console.log("Something went wrong wile inserting default items to the database . err : "+err);
      })
      res.redirect("/");
    }else{
      res.render("list", { listTitle: "Today", newListItems: todos });
    }
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/", async function (req, res) {
  const name = req.body.newItem;
  const listName = req.body.list;
  const newTodo = new Todo({
    name: name
  });
  if (listName === "Today") {
    newTodo.save().then(() => {
      res.redirect("/");
    });
  } else {
    const result = await CustomList.findOne({ listName: listName }).exec();
    if(result) {
      result.listItems.push(newTodo);
      result.save();
      res.redirect("/" + listName);
    }else{
      res.status(500).send("Internal Server Error");
    }
  }
});

app.post("/delete",async (req, res) => {
  const id = req.body.checkbox;
  const listName = req.body.listName;
  if(listName==="Today"){
    Todo.findByIdAndDelete(id)
      .then((deletedTodo) => {
        if (!deletedTodo) {
          console.log(`Todo with ID ${id} not found.`);
          res.redirect("/");
        } else {
          console.log(`Todo with ID ${id} deleted: `, deletedTodo);
          res.redirect("/");
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send("Error deleting todo.");
      });
    }else{
      CustomList.findOneAndUpdate({ listName: listName }, { $pull: { listItems: { _id: id } } })
    .then((result) => {
      if (result === null) {
        // If result is null, it means the id did not match any items
        res.status(404).send("Item not found");
      } else {
        res.redirect("/" + listName);
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Internal Server Error");
    });

    // const result = await CustomList.findOne({ listName: listName }).exec();
    // if(result){
    //   const index = result.listItems.findIndex(( item )=>{ item._id === id });
    //   result.listItems.splice(index,1);
    //   result.save();
    //   res.redirect("/" + listName);
    // }else{
    //   res.status(500).send("Internal Server Error");
    // }
    
  };
  
});

app.get("/:customList", async (req, res) => {
  try {
    const listName = _.capitalize(req.params.customList);
    const isOldList = await CustomList.findOne({ listName }).exec();

    if (!isOldList) {
      // Create a new custom list with default items
      const customList = new CustomList({
        listName : listName,
        listItems: defaultItems,
      });

      await customList.save();
      console.log("Default items inserted successfully into " + listName);
      res.redirect("/" + listName);
    } else {
      res.render("list", { listTitle: isOldList.listName, newListItems: isOldList.listItems });
    }
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
