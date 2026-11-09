import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    'aiux-color-swatch|spm-unified-hub': {
                        table: 'sys_aix_color_swatch'
                        id: '73cd07382978d3fbcc53aec33e139ae4'
                        deleted: true
                    }
                    'aiux-experience-page-rel|x-spm-unified-hub-home-page': {
                        table: 'sys_aix_experience_page_rel'
                        id: '1957417fe01499499647fa17e3957171'
                    }
                    'aiux-experience-page-rel|x-spm-unified-hub-incidents-page': {
                        table: 'sys_aix_experience_page_rel'
                        id: 'c3716a053a69a26f23d4d92fcf1ea5ed'
                    }
                    'aiux-experience-prop|appHeadCss': {
                        table: 'sys_aix_experience_properties'
                        id: 'a6786cf0798c6e27a2858987a50c8826'
                    }
                    'aiux-experience-prop|appTailwindCss': {
                        table: 'sys_aix_experience_properties'
                        id: '08501a418d192c8e975b531f207e9dab'
                    }
                    'aiux-experience|spm-unified-hub': {
                        table: 'sys_aix_experience'
                        id: 'a3c2fcedea8776bf9cf4ec39e386ac11'
                    }
                    'aiux-layout-widget|lifecycle': {
                        table: 'sys_aix_widget'
                        id: '5163ac7bd9dee1104ea9ec07e9d61cef'
                    }
                    'aiux-page-widget|x-spm-unified-hub-home-page': {
                        table: 'sys_aix_widget'
                        id: 'fce2f75f38c3fb58dcd8cc08e301c43a'
                    }
                    'aiux-page-widget|x-spm-unified-hub-incidents-page': {
                        table: 'sys_aix_widget'
                        id: 'bd3102dfc76bdbd7af96b33a959666aa'
                    }
                    'aiux-page|x-spm-unified-hub-home-page': {
                        table: 'sys_aix_page'
                        id: 'ac019b929176c2497f45bbf9db07e520'
                    }
                    'aiux-page|x-spm-unified-hub-incidents-page': {
                        table: 'sys_aix_page'
                        id: '289da0e31ac3a594eca44ead5a507c1a'
                    }
                    'aiux-project|x_custom_spm_hub': {
                        table: 'sys_aix_project'
                        id: '209f0bb9737073d5da6a7edb1d80c667'
                    }
                    'aiux-theme|spm-unified-hub': {
                        table: 'sys_aix_theme'
                        id: '3aa79128e5dd9283aa37d123db1c4717'
                    }
                    'aiux-widget|aiux-hello-world': {
                        table: 'sys_aix_widget'
                        id: '9dfa889981cbfdc4c2320ee86dbfceb4'
                    }
                    bom_json: {
                        table: 'sys_module'
                        id: '77bb41b054dc4e088cbc288e3338095d'
                    }
                    package_json: {
                        table: 'sys_module'
                        id: 'c8febb94e3a148c6b186e3e1d4a861ce'
                    }
                    spm_hub_api_version_1: {
                        table: 'sys_ws_version'
                        id: '80bafbfa411b4c9785d9db10305272f3'
                    }
                    spm_hub_assist: {
                        table: 'sys_ws_operation'
                        id: '2eb00c057b2647ba9671807b9d443072'
                    }
                    spm_hub_convert_demand: {
                        table: 'sys_ws_operation'
                        id: '2702479d3bf748a4a28ed34681353dff'
                    }
                    spm_hub_get_workspace: {
                        table: 'sys_ws_operation'
                        id: '5cd3c698a03a490094a7d4442631d462'
                    }
                    spm_hub_swap_resource_plan: {
                        table: 'sys_ws_operation'
                        id: '8bb08facec3a44b09e1327fc4d635fc6'
                    }
                    spm_hub_workspace_api: {
                        table: 'sys_ws_definition'
                        id: '9771b77fe5bc46af906e5bf240230dde'
                    }
                }
                composite: [
                    {
                        table: 'sn_glider_source_artifact'
                        id: '2d9183a72ea745e9a9f6209a695be1b7'
                        key: {
                            name: 'aiux-source 209f0bb9737073d5da6a7edb1d80c667'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: 'd2a61e10080e49ae9b5b4c5136af4af2'
                        key: {
                            application_file: '209f0bb9737073d5da6a7edb1d80c667'
                            source_artifact: '2d9183a72ea745e9a9f6209a695be1b7'
                        }
                    },
                ]
            }
        }
    }
}
