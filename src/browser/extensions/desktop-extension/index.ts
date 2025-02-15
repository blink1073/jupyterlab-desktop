/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { IMainMenu } from '@jupyterlab/mainmenu';

import { IStatusBar } from '@jupyterlab/statusbar';

import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import { PageConfig } from '@jupyterlab/coreutils';

import { ElectronJupyterLab } from '../electron-extension';

import { asyncRemoteRenderer } from '../../../asyncremote';

import { IAppRemoteInterface } from '../../../main/app';
import { IPythonEnvironment } from 'src/main/tokens';
import { EnvironmentStatus } from './envStatus';
import { ISessions } from '../../../main/sessions';

const desktopExtension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-desktop.extensions.desktop',
  requires: [IMainMenu, IStatusBar],
  activate: (
    app: ElectronJupyterLab,
    menu: IMainMenu,
    statusBar: IStatusBar
  ) => {
    asyncRemoteRenderer.onRemoteEvent(
      ISessions.navigatedToHash,
      (hash: string) => {
        console.debug(`Navigate to hash received, navigating to: ${hash}`);
        window.location.hash = hash;
      }
    );

    app.commands.addCommand('check-for-updates', {
      label: 'Check for Updates…',
      execute: () => {
        asyncRemoteRenderer.runRemoteMethod(
          IAppRemoteInterface.checkForUpdates,
          void 0
        );
      }
    });

    app.commands.addCommand('open-dev-tools', {
      label: 'Open Developer Tools',
      execute: () => {
        asyncRemoteRenderer.runRemoteMethod(
          IAppRemoteInterface.openDevTools,
          void 0
        );
      }
    });

    menu.helpMenu.addGroup(
      [{ command: 'open-dev-tools' }, { command: 'check-for-updates' }],
      20
    );

    const changeEnvironment = async () => {
      asyncRemoteRenderer.runRemoteMethod(
        IAppRemoteInterface.showPythonPathSelector,
        void 0
      );
    };

    const statusItem = new EnvironmentStatus({
      name: 'env',
      description: '',
      onClick: changeEnvironment
    });

    statusBar.registerStatusItem('jupyterlab-desktop-py-env-status', {
      item: statusItem,
      align: 'left'
    });

    const updateStatusItemLocal = (env: IPythonEnvironment) => {
      statusItem.model.name = `Local (${env.name})`;
      let packages = [];
      for (const name in env.versions) {
        packages.push(`${name}: ${env.versions[name]}`);
      }
      statusItem.model.description = `Local server\n${env.name}\n${
        env.path
      }\n${packages.join(', ')}`;
    };

    const updateStatusItemRemote = (url: string) => {
      statusItem.model.name = 'Remote';
      statusItem.model.description = `Remote server\n${url}`;
    };

    // patch for index.html? shown as app window title
    app.shell.layoutModified.connect(() => {
      setTimeout(() => {
        if (document.title.startsWith('index.html?')) {
          document.title = 'JupyterLab';
        }
      }, 100);
    });

    const serverType = PageConfig.getOption('jupyterlab-desktop-server-type');
    if (serverType === 'local') {
      asyncRemoteRenderer
        .runRemoteMethod(
          IAppRemoteInterface.getCurrentPythonEnvironment,
          void 0
        )
        .then(env => {
          updateStatusItemLocal(env);
        });
    } else {
      const serverUrl = PageConfig.getOption('jupyterlab-desktop-server-url');
      updateStatusItemRemote(serverUrl);
    }
  },
  autoStart: true
};

export default desktopExtension;
