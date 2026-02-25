import { useState, type ChangeEvent, type FormEvent } from "react";
import { BrowserRouter, Route} from 'react-router-dom';

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const toggleLogin = () => { 
    setLoggedIn(!loggedIn);
  }
  return (
    <BrowserRouter>
     {loggedIn ? (
        <Route path="/">
          <Dashboard loggedIn={loggedIn} toggleLogin={toggleLogin} />
        </Route>
      ) : (
        <Route path="/">
          <Home loggedIn={loggedIn} toggleLogin={toggleLogin} />
        </Route>
      )}
      
    </BrowserRouter>
  )
}
