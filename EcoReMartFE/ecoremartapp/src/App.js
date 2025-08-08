import logo from './logo.svg';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import Header from './layout/Header';
import Footer from './layout/Footer';
import Home from './components/Home';
import ProductDetail from './components/ProductDetail';
import Comments from './components/comment';

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/product/:id' element={<ProductDetail />}>
          <Route path='comments' element={<Comments />} />
        </Route>
      </Routes>
      <Footer />
    </>
  );
}

export default App;
