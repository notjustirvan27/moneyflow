<?php

namespace app\controllers;

class DataController extends SiteController {

    private function getData($name) {

        /* check cache file */
            $cache = "/cache/" . $name . ".temp";
            if(file_exists($cache)) return \yii\helpers\Json::decode(file_get_contents($cache));
        
        /* constructing name */
            $name = explode("/", $name);
        
        /* routing */
            switch($name[0]) {

                case "config":
                    array_slice($name, 1);
                    return $this->getConfig(implode("/", $name));
                break;

                case "rows":
                    
                break;

            }
        
        return null;
    }

    public function actionGet() {

        if(\Yii::$app->request->isPost) {
            $result['state'] = 0;

            /* collecting parameters */
                $registered = \Yii::$app->request->post("registered");

            /* checking paramteres */
                if(isset($registered)) {
                    $result['state'] = 100;
                    $result['data'] = [];
                    $registered = \yii\helpers\Json::decode($registered);

                        
                    /* fetching registered data */
                        if(json_last_error() == JSON_ERROR_NONE) {
                            foreach($registered as $x => $data) {
                                $result['data'][$x] = $this->getData($x);
                            }
                        }
                }

            return \yii\helpers\Json::encode($result);
        }

        return $this->actionIndex();

    }

}