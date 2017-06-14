import React from 'react';
import Drawer from 'material-ui/Drawer';
import AppBar from 'material-ui/AppBar';
import Chip from 'material-ui/Chip';
import Avatar from 'material-ui/Avatar';
import CircularProgress from 'material-ui/CircularProgress';
import {indigo500,white,blue900,indigo50}  from 'material-ui/styles/colors';
import {List, ListItem} from 'material-ui/List';
import {Tabs, Tab} from 'material-ui/Tabs'
import TaskService from './services/tasksService.jsx'
import ProfileService from './services/profileService.jsx'
export default class TasksPanel extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: true,
      tasks:[],
      profiles:[]
    }
    this.TaskService=new TaskService('/apps/cartoview_geo_task_manager/api/geotasks/task');
    this.ProfileService=new ProfileService('/api/profiles/');
  }
  componentDidMount(){
    this.TaskService.getTaskList().then((response)=>{
      this.setState({tasks:response.objects,loading:false})
    })
  }
  getProfiles(){
    this.setState({profiles:this.ProfileService.ProfileList()})
  }
  render() {
    let loader = this.state.loading ? <div style={{padding: 12,textAlign: 'center'}}><CircularProgress size={80} thickness={5} color={blue900}/></div>
      : "";
      let listHeader=<ListItem hoverColor="transparent" style={{textAlign:'center'}}><Chip style={{margin:4}} backgroundColor={indigo50}>
          <Avatar color={white} backgroundColor={indigo500} size={32}>{this.state.tasks.length}</Avatar>
          Available Tasks
        </Chip></ListItem>
    let tasks= this.state.tasks.length>0 && !this.state.loading ? <list>{listHeader}{this.state.tasks.map((task)=>{
          return <ListItem primaryText={task.title} onTouchTap={this.taskDetails.bind(this)}></ListItem>
        })}</list>: <List>{listHeader}<ListItem primaryText="No Tasks For Now"></ListItem></List>;
    let profiles= this.state.profiles.length>0 && !this.state.loading ? <List>
      <Subheader>Surveyors</Subheader>
      {this.state.profiles.map((profile)=>{
        return (<ListItem
          primaryText={profile.username}
          leftAvatar={<Avatar src={profile.avatar_100} />}
        />)
      })}
    </List>:"";
    let tabs=  <Tabs>
                <Tab icon={<i className="fa fa-tasks"></i>}>{loader}{tasks}</Tab>
                <Tab icon={<i className="fa fa-users"></i>} onTouchTap={this.getProfiles.bind(this)}>{profiles}</Tab>
              </Tabs>;
    return (
      <Drawer width="30%" openSecondary={true} open={true}>
        <AppBar title={title} showMenuIconButton={false}/>
        {tabs}
      </Drawer>
    );
  }
}
TasksPanel.childContextTypes = {
  muiTheme: React.PropTypes.object
};
