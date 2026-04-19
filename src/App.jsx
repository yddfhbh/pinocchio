import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import Scores from "./pages/Scores";
import Videos from "./pages/Videos";
import Schedule from "./pages/Schedule";
import Guestbook from "./pages/Guestbook";
import useAdminSession from "./hooks/useAdminSession";
import "./App.css";

function App() {
  const adminSession = useAdminSession();

  return (
    <div className="site-wrapper">
      <Header
        isAdmin={adminSession.isAdmin}
        isLoading={adminSession.isLoading}
        isSubmitting={adminSession.isSubmitting}
        onLogin={adminSession.login}
        onLogout={adminSession.logout}
      />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/scores" element={<Scores />} />
          <Route path="/videos" element={<Videos isAdmin={adminSession.isAdmin} />} />
          <Route path="/schedule" element={<Schedule isAdmin={adminSession.isAdmin} />} />
          <Route path="/guestbook" element={<Guestbook isAdmin={adminSession.isAdmin} />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
