import React from 'react';
import '@babylonjs/loaders/glTF';

import glbModel from '../models/sample-avatar.glb?url';
import { useSceneLoader } from 'react-babylonjs';
import useAvatar from '../hooks/useAvatar';

const folderName = glbModel.split('/').slice(0, -1).join('/').concat('/');
const fileName = glbModel.split('/').slice(-1)[0];

const Avatar: React.FC = () => {
  const { setModel } = useAvatar();

  useSceneLoader(folderName, fileName, undefined, {
    onModelLoaded: (model) => {
      setModel(model);
    },
  });

  return null;
};

export default Avatar;
