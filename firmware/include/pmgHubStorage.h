#pragma once

#include <LittleFS.h>

namespace pmgHub {

    class storage {

        private:

            fs::LittleFSFS _webFS;
            fs::LittleFSFS _dataFS;

            bool _webReady = false;
            bool _dataReady = false;     

        public:

            storage();

            fs::LittleFSFS& getWebFS();
            fs::LittleFSFS& getDataFS();

            bool isWebReady() const;
            bool isDataReady() const;

    };

};