import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import Scores from "./pages/Scores";
import Videos from "./pages/Videos";
import Schedule from "./pages/Schedule";
import Guestbook from "./pages/Guestbook";
import "./App.css";

function App() {
  return (
    <div className="site-wrapper">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/scores" element={<Scores />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/guestbook" element={<Guestbook />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;