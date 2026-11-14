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

            fs::LittleFSFS& getWebFS() const;
            fs::LittleFSFS& getDataFS() const;

            bool storage::isWebReady() const;
            bool storage::isDataReady() const;

    };

};