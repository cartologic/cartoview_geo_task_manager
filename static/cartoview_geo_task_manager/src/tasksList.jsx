import React from 'react';
import FloatingActionButton from 'material-ui/FloatingActionButton';
import Drawer from 'material-ui/Drawer';
import ol from 'openlayers';
import IconButton from 'material-ui/IconButton';
import Chip from 'material-ui/Chip';
import {
  Table,
  TableBody,
  TableHeader,
  TableHeaderColumn,
  TableRow,
  TableRowColumn
} from 'material-ui/Table';
import FlatButton from 'material-ui/FlatButton';
import CircularProgress from 'material-ui/CircularProgress';
import WMSService from '@boundlessgeo/sdk/services/WMSService';
export default class TaskList extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      open: false
    }
    this.state = {
      ready: false,
      busy: false,
      features: [],
      activeFeature: 0
    }
  }
  componentDidMount() {
    this.init(this.props.map)
  }
  resultItem(f) {
    var keys = f.getKeys();
    var geom = f.getGeometryName();
    return <div>
      <div className="layer-title">Layer : <h4>{f.get('_layerTitle')}</h4></div>
      <div className="identify-result-ct">
        <Table selectable={false} key={f.getId()}>
          <TableBody>
            {keys.map((key) => {
              if (key == geom || key == "_layerTitle")
                return null;
              return <TableRow key={key}>
                <TableRowColumn>{key}</TableRowColumn>
                <TableRowColumn>{f.get(key)}</TableRowColumn>
              </TableRow>
            })
}
          </TableBody>
        </Table>
      </div>
    </div>;
  }
  init(map) {
    map.on('singleclick', (e) => {
      this.getLayers(map.getLayers().getArray()).forEach((layer) => {
        this.setState({busy: true, features: [], activeFeature: 0})
        WMSService.getFeatureInfo(layer, e.coordinate, map, 'application/json', (result) => {
          this.state.features = this.state.features.concat(result.features);
          result.features.forEach(f => f.set("_layerTitle", result.layer.get('title')))
          this.setState({features: this.state.features, busy: false});
        });
      })
    });
  }
  isWMS(layer) {
    return layer.getSource()instanceof ol.source.TileWMS || layer.getSource()instanceof ol.source.ImageWMS;
  }
  getLayers(layers) {
    var children = [];
    layers.forEach((layer) => {
      if (layer instanceof ol.layer.Group) {
        children = children.concat(this.getLayers(layer.getLayers()));
      } else if (layer.getVisible() && this.isWMS(layer)) {
        children.push(layer);
      }
    });
    return children;
  }

  render() {
    var {ready, busy, features, activeFeature} = this.state;
    const prev = (e) => {
      if (activeFeature == 0)
        return;
      activeFeature--;
      this.setState({activeFeature});
    };
    const next = (e) => {
      if (activeFeature == features.length - 1)
        return;
      activeFeature++;
      this.setState({activeFeature});
    };
    return (
      <div>
        <FloatingActionButton className="about-ico" mini={true}>
          <i className="fa fa-info" aria-hidden="true"></i>
        </FloatingActionButton>
        <Drawer width="30%" open={this.state.open}>
          <div style={{width:"100%",height:"100%"}}>
            {busy && <CircularProgress />}
            {!busy && (features.length == 0) && <div className="identify-no-results">No Results, Click the map to identify features.</div>}
            {!busy && (features.length > 0) && <div>
              <div className="feature-paging">
                <div style={{marginLeft: 'auto'}}>
                  <IconButton iconClassName="fa fa-angle-left" onClick={e => prev(e)} disabled={activeFeature == 0}/>
                  <span style={{padding: 12,paddingTop: 16}}>{activeFeature + 1} / {features.length}</span>
                  <IconButton iconClassName="fa fa-angle-right" onClick={e => next(e)} disabled={activeFeature == features.length - 1}/>
                </div>
              </div>
              {this.resultItem(features[activeFeature])}
            </div>
}
          </div>
        </Drawer>

      </div>
    );
  }
}
