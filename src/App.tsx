import { BrowserRouter, Switch, Route } from "react-router-dom";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Switch>
          <Route path="/dashboard">
            <Dashboard />
          </Route>
          <Route path="/" exact>
            <Home />
          </Route>
        </Switch>
      </Layout>
    </BrowserRouter>
  );
}
