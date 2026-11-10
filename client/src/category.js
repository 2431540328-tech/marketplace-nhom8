import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

class Category extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      category_data: []
    };
  }

  componentDidMount() {
    this.get_category('category');
  }

  onClickViewAll = () => {
    this.get_category('category/viewall');
  };

  get_category = (view_all) => {
    let url = `http://localhost:5000/api/categories/${view_all}`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw Error(res.statusText);
        return res.json();
      })
      .then(data => {
        console.log('category_data=', data.category);
        this.setState({ category_data: data.category });
      })
      .catch(error => console.log('Có lỗi nè: \n', error));
  };

  render() {
    return (
      <div className="container my-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3>Category (Loại sản phẩm Nhóm 08)</h3>
          <button onClick={this.onClickViewAll} className="btn btn-outline-primary btn-sm">
            View All
          </button>
        </div>
        <div className="row text-center">
          {this.state.category_data.map((cat, idx) => (
            <div key={idx} className="col-6 col-md-4 col-lg-3 mb-4">
              <div className="p-3 border rounded shadow-sm bg-white h-100">
                <img
                  src={cat.icon}
                  alt={cat.name}
                  className="img-fluid mb-2"
                  style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                />
                <h6 className="fw-bold">{cat.name}</h6>
                <p className="text-muted small mb-1">{cat.description}</p>
                <p className="text-danger fw-bold small mb-0">{cat.items} items</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export default Category;