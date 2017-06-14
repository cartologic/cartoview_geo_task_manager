import React from 'react';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import FloatingActionButton from 'material-ui/FloatingActionButton';

import MenuItem from 'material-ui/MenuItem';
export default class CartoviewAbout extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false
    };
  }

  _handleOpen() {
    this.setState({open: true});
  };

  _handleClose() {
    this.setState({open: false});
  };

  render() {
    const actions = [< FlatButton label = "Close" primary = {
        true
      }
      keyboardFocused = {
        true
      }
      onTouchTap = {
        this._handleClose.bind(this)
      } />];

    return (
      <div>
        <FloatingActionButton className="about-ico" onTouchTap={this._handleOpen.bind(this)} mini={true}>
            <i className="fa fa-info" aria-hidden="true"></i>
          </FloatingActionButton>
        <Dialog title={title} actions={actions} modal={false} open={this.state.open} onRequestClose={this._handleClose.bind(this)} autoScrollBodyContent={true} contentClassName="dialog" bodyClassName="dialog_body">
          <div >
            <p>{abstract}</p>
          </div>
        </Dialog>
      </div>
    );
  }
}
