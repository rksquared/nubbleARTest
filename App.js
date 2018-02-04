import 'prop-types'; // 15.6.0
import 'three'; // 0.88.0

import ExpoGraphics from 'expo-graphics'; // 0.0.1
import ExpoTHREE, { THREE } from 'expo-three'; // LATEST
import React from 'react';
import { PixelRatio, View } from 'react-native';

export default class App extends React.Component {
  render() {
    return (
      <View style={{ flex: 1 }}>
        <ExpoGraphics.View
            style={{ flex: 1 }}
            onContextCreate={this.onContextCreate}
            onRender={this.onRender}
            onResize={this.onResize}
            arEnabled
        />
      </View>
    );
  }

onContextCreate = async (gl, arSession) => {

    this.arSession = arSession;
    const { drawingBufferWidth, drawingBufferHeight } = gl;
    const scale = PixelRatio.get();

    const width = drawingBufferWidth / scale;
    const height = drawingBufferHeight / scale;

    // renderer
    this.renderer = ExpoTHREE.createRenderer({
      gl,
    });
    this.renderer.setPixelRatio(scale);
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x000000, 1.0);

    /// Standard Camera
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 10000);
    this.camera.position.set(5, 5, -5);
    this.camera.lookAt(0, 0, 0);

    this.scene = new THREE.Scene();
    this.scene.add(new THREE.GridHelper(5, 6, 0xffffff, 0x555555));

    this.setupLights();

    // AR Background Texture
    this.scene.background = ExpoTHREE.createARBackgroundTexture(arSession, this.renderer);

    /// AR Camera
    this.camera = ExpoTHREE.createARCamera(arSession, width, height, 0.01, 1000);

    /// Enable ARKit light estimation
    ExpoTHREE.setIsLightEstimationEnabled(arSession, true);

    /// Enable ARKit plane detection - this will let us get the raw point data
    ExpoTHREE.setIsPlaneDetectionEnabled(arSession, true);

    await this.loadModelsAsync();
  };

  setupLights = () => {
    this.light = new THREE.DirectionalLight(0x002288);
    this.light.position.set(1, 1, -1);
    this.scene.add(this.light);

    const light = new THREE.AmbientLight(0x222222);
    this.scene.add(light);
  };


  /// Magic happens here!
  loadModelsAsync = async () => {
    /// Get all the files in the mesh
    const model = {
      'thomas.obj': require('./baby/untitled-scene.obj'),
      'thomas.mtl': require('./baby/untitled-scene.mtl')
      //'thomas.png': require('./baby/untitled-scene.png')
    };

    /// Load model!
    const mesh = await ExpoTHREE.loadAsync(
      [model['thomas.obj'], model['thomas.mtl']],
      null,
      name => model[name],
    );

    /// Update size and position
    ExpoTHREE.utils.scaleLongestSideToSize(mesh, 10);
    ExpoTHREE.utils.alignMesh(mesh, { y: .6, z: -1.6 });
    /// Smooth mesh
    ExpoTHREE.utils.computeMeshNormals(mesh);

    /// Add the mesh to the scene
    this.scene.add(mesh);

    /// Save it so we can rotate
    this.mesh = mesh;
  };

  onResize = ({ width, height }) => {
    const scale = PixelRatio.get();

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(scale);
    this.renderer.setSize(width, height);
  };

  onRender = () => {
    const lightEstimation = ExpoTHREE.getARLightEstimation(this.arSession);
    if (lightEstimation) {
      this.light.intensity = 1 / 2000 * lightEstimation.ambientIntensity;
      // this.light.ambientIntensity = lightEstimation.ambientColorTemperature;
    }

    const { scene, renderer, camera } = this;
    renderer.render(scene, camera);
  };
}