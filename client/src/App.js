import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import FormSearchProduct from "./FormSearchProduct";
import Category from "./category";
import Products from "./products";

function App() {
  const [tab, setTab] = useState("all");

  return (
    <div style={{ backgroundColor: "#fff5f8", minHeight: "100vh", paddingBottom: "40px" }}>
      <div
        className="text-center py-4 mb-4 shadow-sm"
        style={{ background: "linear-gradient(135deg, #f4acb7 0%, #e8dff5 100%)", color: "#4a148c" }}
      >
        <h2 className="fw-bold text-white">SÀN THƯƠNG MẠI ĐIỆN TỬ ĐA NGƯỜI BÁN - NHÓM 08</h2>
        <div className="d-flex justify-content-center gap-2 flex-wrap mt-3">
          <button
            className={`btn btn-sm fw-bold rounded-pill px-3 ${tab === "all" ? "btn-danger" : "btn-light"}`}
            onClick={() => setTab("all")}
          >
            Gộp Lab 09 (Bài 1 + Bài 2)
          </button>
          <button
            className={`btn btn-sm fw-bold rounded-pill px-3 ${tab === "lab8" ? "btn-danger" : "btn-light"}`}
            onClick={() => setTab("lab8")}
          >
            Lab 08: Tìm Kiếm Sản Phẩm
          </button>
          <button
            className={`btn btn-sm fw-bold rounded-pill px-3 ${tab === "lab9_b1" ? "btn-danger" : "btn-light"}`}
            onClick={() => setTab("lab9_b1")}
          >
            Lab 09 - Bài 1: Category
          </button>
          <button
            className={`btn btn-sm fw-bold rounded-pill px-3 ${tab === "lab9_b2" ? "btn-danger" : "btn-light"}`}
            onClick={() => setTab("lab9_b2")}
          >
            Lab 09 - Bài 2: Products
          </button>
        </div>
      </div>

      {tab === "lab8" && <FormSearchProduct />}
      {tab === "lab9_b1" && <Category />}
      {tab === "lab9_b2" && <Products />}
      {tab === "all" && (
        <>
          <Category />
          <hr className="container my-4" />
          <Products />
        </>
      )}
    </div>
  );
}

export default App;