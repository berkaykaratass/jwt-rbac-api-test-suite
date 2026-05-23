const { authJwt } = require("../middlewares");
const tutorials = require("../controllers/tutorial.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Create a new Tutorial (requires authentication)
  app.post("/api/tutorials", [authJwt.verifyToken], tutorials.create);

  // Retrieve all Tutorials
  app.get("/api/tutorials", tutorials.findAll);

  // Retrieve all published Tutorials
  app.get("/api/tutorials/published", tutorials.findAllPublished);

  // Retrieve a single Tutorial with id
  app.get("/api/tutorials/:id", tutorials.findOne);

  // Update a Tutorial with id (requires authentication)
  app.put("/api/tutorials/:id", [authJwt.verifyToken], tutorials.update);

  // Delete a Tutorial with id (requires authentication)
  app.delete("/api/tutorials/:id", [authJwt.verifyToken], tutorials.delete);

  // Delete all Tutorials (requires admin role)
  app.delete("/api/tutorials", [authJwt.verifyToken, authJwt.isAdmin], tutorials.deleteAll);
};
