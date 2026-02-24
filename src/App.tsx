import { useState, type ChangeEvent, type FormEvent } from "react";
import { BrowserRouter, Route} from 'react-router-dom';

import Home from "./pages/Home";

export default function App() {
  return (
    <BrowserRouter>
      <Route path="/">
        <Home />
      </Route>
    </BrowserRouter>
  )
}
