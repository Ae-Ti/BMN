import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./component/Layout";
import RecipeMain from "./component/pages/RecipeMain";
import PostCreate from "./component/pages/PostCreate"; // 게시글 작성 페이지 추가
import LogIn from "./component/pages/LogIn"; // 로그인 페이지 import
import SignUp from "./component/pages/SignUp"; // 회원가입 페이지 임포트
import HouseholdLedgerMain from './component/pages/HouseholdLedgerMain';





const App = () => {
  return (
    <Router>
      <Routes>
          <Route path="/" element={<Layout />}>
          <Route index element={<RecipeMain />} />
          <Route path="post-create" element={<PostCreate />} /> {/* 게시글 작성 페이지 */}
          <Route path="user/login" element={<LogIn />} /> {/* 로그인 페이지 추가 */}
          <Route path="/signup" element={<SignUp />} />
          <Route path="/household-ledger" element={<HouseholdLedgerMain />} /> {/* App.js 내부에서 라우팅 추가*/}
        </Route>
      </Routes>
    </Router>
  );
};

export default App;





//import logo from './logo.svg';
//import './App.css';

//function App() {
//  return (
//    <div className="App">
//      <header className="App-header">
//        <img src={logo} className="App-logo" alt="logo" />
//        <p>
//          Edit <code>src/App.js</code> and save to reload.
//        </p>
//        <a
//          className="App-link"
//        href="https://reactjs.org"
  //        target="_blank"
  //        rel="noopener noreferrer"
//        >
//          Learn React
//        </a>
//      </header>
//    </div>
//  );
//}

//export default App;
