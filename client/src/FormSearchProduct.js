import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

class FormSearchProduct extends React.Component {
  constructor() {
    super();
    this.state = { product_data: [] };
    this.tukhoa = React.createRef();
  }

  componentDidMount() {
    this.timSanPham();
  }

  timSanPham = () => {
    let tk = this.tukhoa.current ? this.tukhoa.current.value.trim() : '';
    let url = 'http://localhost:5000/api/products';

    if (tk) {
      url += `/${encodeURIComponent(tk)}`;
    }

    fetch(url)
      .then(res => {
        if (!res.ok) throw Error(res.statusText);
        return res.json();
      })
      .then(data => {
        console.log('results=', data);
        this.setState({ product_data: data });
      })
      .catch(error => console.log('Có lỗi nè: \n', error));
  };

  render() {
    return (
      <div>
        <form
          className="container d-flex justify-content-left mt-4"
          onSubmit={e => {
            e.preventDefault();
            this.timSanPham();
          }}
        >
          <div className="input-group" style={{ width: '450px' }}>
            <input
              ref={this.tukhoa}
              className="form-control"
              placeholder="Nhập tên hoặc ID sản phẩm (VD: Tai nghe, Hoodie, Iphone...)"
            />
            <button onClick={this.timSanPham} type="button" className="btn btn-primary">
              <i className="bi bi-search"></i>
            </button>
          </div>
        </form>

        <div className="container mt-4">
          <h4 className="text-left mb-4">Danh mục sản phẩm Sàn TMĐT (Lab 08)</h4>
          <div className="row">
            {this.state.product_data.map((sp, index) => (
              <div className="col-md-4 mb-4" key={index}>
                <div className="card h-100 shadow-sm">
                  <img
                    src={sp.images && sp.images[0]}
                    className="card-img-top p-3"
                    alt={sp.productName}
                    style={{ height: '200px', objectFit: 'contain' }}
                  />
                  <div className="card-body">
                    <h5 className="card-title text-primary">{sp.productName}</h5>
                    <p className="card-text mb-1">Danh mục: <strong>{sp.category}</strong></p>
                    <p className="card-text text-secondary mb-2">Gian hàng: {sp.shopName}</p>
                    <p className="text-danger fw-bold mb-1">
                      Giá: {Number(sp.price).toLocaleString()} đ
                    </p>
                    <p className="text-muted" style={{ fontSize: '13px' }}>
                      Tồn kho: {sp.quantity} sản phẩm
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

export default FormSearchProduct;