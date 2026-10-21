// SYNTHETIC TEST FIXTURE: static analysis input only.
export function register(app, documents) {
  app.get("/documents/:id", (req, res) => {
    res.json(documents[req.params.id]);
  });
}
