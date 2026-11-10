import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

class Products extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      products_data: [],
      filterRating: 0,
      filterCategory: "all",
    };
  }

  componentDidMount() {
    this.getProducts();
  }

  onChangeRatingFilter = (rating) => {
    this.setState((prevState) => ({
      filterRating: prevState.filterRating === rating ? 0 : rating,
    }));
  };

  onChangeCategoryFilter = (category) => {
    this.setState({ filterCategory: category });
  };

  getProducts = () => {
    let url = `http://localhost:5000/api/products/products`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw Error(res.statusText);
        return res.json();
      })
      .then((data) => {
        console.log("products_data=", data.products);
        this.setState({ products_data: data.products });
      })
      .catch((error) => console.log("Có lỗi nè: \n", error));
  };

  handleAddToCart = (product) => {
    fetch("http://localhost:5000/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerName: "Nguyễn Văn A",
        productName: product.productName || product.name,
        price: product.price,
        shopName: product.shopName || product.brand,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        alert(`Đã thêm "${product.name}" vào giỏ hàng!`);
      });
  };

  render() {
    const { products_data, filterRating, filterCategory } = this.state;
    const filtered = products_data.filter((p) => {
      const matchRating = filterRating ? p.rating >= filterRating : true;
      const matchCategory = filterCategory === "all" ? true : p.category === filterCategory;
      return matchRating && matchCategory;
    });

    return (
      <div className="container my-4">
        <div className="row">
          {/* FILTER */}
          <div className="col-md-3">
            <div className="border rounded p-3 bg-light">
              <h5>Filter Options</h5>
              <hr />
              <div>
                <h6>Popular Filter</h6>
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={filterRating === 5}
                    onChange={() => this.onChangeRatingFilter(5)}
                  />
                  <label className="form-check-label">5 star or upper</label>
                </div>
                <div className="form-check">
                  <input type="checkbox" className="form-check-input" />
                  <label className="form-check-label">Same day delivery</label>
                </div>
                <div className="form-check">
                  <input type="checkbox" className="form-check-input" />
                  <label className="form-check-label">Super seller</label>
                </div>
                <div className="form-check">
                  <input type="checkbox" className="form-check-input" />
                  <label className="form-check-label">Sale Product</label>
                </div>
              </div>

              <hr />
              <div>
                <h6>Category</h6>
                {["all", "Công nghệ", "Thời trang", "Phụ kiện"].map((cat) => (
                  <div className="form-check" key={cat}>
                    <input
                      type="radio"
                      name="catFilter"
                      className="form-check-input"
                      checked={filterCategory === cat}
                      onChange={() => this.onChangeCategoryFilter(cat)}
                    />
                    <label className="form-check-label">
                      {cat === "all" ? "Tất cả danh mục" : cat}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PRODUCT LIST */}
          <div className="col-md-9">
            <div className="row">
              {filtered.map((p, idx) => (
                <div className="col-md-4 mb-4" key={idx}>
                  <div className="card h-100 shadow-sm border-0">
                    <img
                      src={p.images[0]}
                      className="card-img-top p-3"
                      alt={p.name}
                      style={{ height: "200px", objectFit: "contain", background: "#fff" }}
                    />
                    <div className="card-body">
                      <h6 className="card-title text-truncate">{p.name}</h6>
                      <p className="text-success fw-bold">{p.price.toLocaleString()} ₫</p>
                      <p className="text-muted mb-1">
                        <i className="bi bi-building"></i> {p.brand}
                      </p>
                      <p className="text-warning mb-2">
                        <i className="bi bi-star-fill"></i> {p.rating}
                      </p>
                      <button onClick={() => this.handleAddToCart(p)} className="btn btn-dark w-100">
                        <i className="bi bi-cart"></i> Add to cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Products;